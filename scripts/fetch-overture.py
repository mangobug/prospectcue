"""Download a region from official Overture Parquet using spatial pushdown.

Requires duckdb==1.4.4. Uses the public unsigned bucket, never AWS credentials.
The operator supplies a pinned release and bbox; no application input reaches SQL.
"""
import argparse, os, pathlib, urllib.request, xml.etree.ElementTree as ET
import duckdb

parser=argparse.ArgumentParser()
parser.add_argument('--release',required=True)
parser.add_argument('--bbox',required=True,help='xmin,ymin,xmax,ymax')
parser.add_argument('--output',required=True)
parser.add_argument('--extension',help='Optional verified official httpfs extension path')
args=parser.parse_args()
import re
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.\d+',args.release): parser.error('Invalid release')
bounds=[float(v) for v in args.bbox.split(',')]
if len(bounds)!=4 or not (-180<=bounds[0]<bounds[2]<=180 and -90<=bounds[1]<bounds[3]<=90): parser.error('Invalid bbox')
prefix=f'release/{args.release}/theme=places/type=place/'
host='https://overturemaps-us-west-2.s3.amazonaws.com'
keys=[];token=None
from urllib.parse import urlencode
while True:
    params={'list-type':'2','prefix':prefix}
    if token: params['continuation-token']=token
    tree=ET.fromstring(urllib.request.urlopen(host+'/?'+urlencode(params),timeout=30).read())
    ns={'s':'http://s3.amazonaws.com/doc/2006-03-01/'}
    keys += [e.text for e in tree.findall('s:Contents/s:Key',ns) if e.text.endswith('.parquet')]
    token=tree.findtext('s:NextContinuationToken',namespaces=ns)
    if not token: break
if not keys: raise SystemExit('No Parquet files found in this official release')
output=pathlib.Path(args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
quote=lambda value:"'"+value.replace("'","''")+"'"
db=duckdb.connect()
if args.extension: db.execute('LOAD '+quote(str(pathlib.Path(args.extension).resolve())))
else: db.execute('INSTALL httpfs; LOAD httpfs;')
if os.environ.get('HTTPS_PROXY'): db.execute('SET http_proxy = ?', [os.environ['HTTPS_PROXY']])
db.execute("SET threads=4; SET memory_limit='512MB'; SET http_timeout=60;")
urls='['+','.join(quote(host+'/'+key) for key in keys)+']'
xmin,ymin,xmax,ymax=bounds
db.execute(f"COPY (SELECT * EXCLUDE(geometry) FROM read_parquet({urls},hive_partitioning=false) WHERE bbox.xmin >= {xmin} AND bbox.xmax <= {xmax} AND bbox.ymin >= {ymin} AND bbox.ymax <= {ymax}) TO {quote(str(output))} (FORMAT JSON,ARRAY false)")
print(f'Official release {args.release}: regional export ready at {output}. No contact values logged.')
