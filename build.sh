#!/bin/sh
# builds docs/ with hashed file names so browsers always load the newest version
set -e
rm -rf docs/app*.js docs/chunks
npx esbuild src/app.js --bundle --splitting --format=esm --minify --target=es2020 --outdir=docs --entry-names=[name]-[hash] --chunk-names=chunks/[name]-[hash] --log-level=error
APP=$(cd docs && ls app-*.js)
CSSV=$(md5sum docs/styles.css | cut -c1-8)
sed -i -E "s#src=\"app[^\"]*\.js\"#src=\"$APP\"#; s#href=\"styles\.css[^\"]*\"#href=\"styles.css?v=$CSSV\"#" docs/index.html
echo "built $APP"
# mirror the same build to the CRM address (crm.leceylan.ae) if that repository is checked out next to this one
if [ -d ../le-ceylan-crm-staff/.git ]; then
  rsync -a --delete --exclude CNAME docs/ ../le-ceylan-crm-staff/docs/
  echo "crm.leceylan.ae" > ../le-ceylan-crm-staff/docs/CNAME
  echo "mirrored to le-ceylan-crm-staff"
fi
