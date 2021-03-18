install:
	npx npm install

test:
	node -r esm test/test.wmts.js

prod:
	NODE_ENV=production npx rollup -c rollup.config.js
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/slider/
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js.map /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/slider/


dev:
	NODE_ENV=development npx rollup -c rollup.config.js
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js.map /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/slider/
#cp /home/martijn/Documents/work/2019-01_sscview-js/dist_test/index.js.map /home/martijn/Documents/work/2019-10_research_assignment_jordi/compare/slider/

