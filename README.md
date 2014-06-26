RequireJS Profiler
=========

Tool to profile the loading of AMD modules loaded via [RequireJS](http://requirejs.org/).

Using the profile
===================

###### Adding the profiler
```HTML
<script src="//cdnjs.cloudflare.com/ajax/libs/require.js/2.1.11/require.min.js"></script>
<script src="rjsprofiler.js"></script>
<script>
	//load first module
	require(["common"]);
</script>
```

###### Getting results from the profiler (from the console)
```javascript
//show a table of the loading times of modules
rjsProfiler.showResult()

//show dependency tree with loading times and initially loaded modules in iFrame
rjsProfiler.printDependencyTree(true)

//show dependency tree just in console
rjsProfiler.printDependencyTree()
```