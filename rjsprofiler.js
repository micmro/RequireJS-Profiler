/*
RequireJS Profiler
timing and dependency tree tracing
Author : Michael Mrowetz
*/

var rjsProfiler;
(function(){
	"use strict";

	var tokenRegExp = /\{(\w+)\}/g,
		standardDeps = {
			require: true,
			exports: true,
			module: true
		};

	var getModuleById = function(id){
		return rjsProfiler.modulesStore[id];
	};

	//gret modules without parents
	var getEntryModules = function(){
		return $.grep(rjsProfiler.modules, function(e){
			return !e.map.parentMap 
		});
	};

	var getModuleDependencies = (function(){
		var mod;
		return function(id){
			mod = getModuleById(id);
			return (mod && mod.dependencies) ? mod.dependencies : [];
		};
	})();

	var testIsFirstLoad = function(initialModule, parentIDs){

		if(!initialModule.map){
			console.error("no map:", initialModule);
			return false;
		}
		var tempParentMap = initialModule.map.parentMap;
		var isFirstLoad = true;

		$.map(parentIDs.slice(0).reverse(), function(parentID){
			if(!tempParentMap || tempParentMap.id != parentID){
				isFirstLoad = false;
				return null;
			}else{
				tempParentMap = (tempParentMap.parentMap) ? tempParentMap.parentMap : undefined;
			}
		});
		return isFirstLoad;
	};

	var returnDepsRecursive =  function(dependencies, parentIDs, depth){
		depth = (depth||0) + 1;
		parentIDs = parentIDs || [];
		//safety form circular dependencies - do not go deeper than 50 level
		if(depth > 50){
			console.log("CANCEL");
			return {};
		}
		
		return $.map(dependencies, function(d){
			var dParentIDs = parentIDs.slice(0);
			if(standardDeps[d.id]){
				return;
			}
			var initialModule = getModuleById(d.id);
			var isFirstLoad = testIsFirstLoad(initialModule, dParentIDs);
			var innerDeps = getModuleDependencies(d.id);

			dParentIDs.push(d.id);
			if(innerDeps.length > 0){ //temp fix - there is a circular dependencie
				return {id : d.id, dependencies : returnDepsRecursive(innerDeps, dParentIDs, depth), isFirstLoad : isFirstLoad, initialModule : initialModule, depth : depth};
			}else{
				return {id : d.id, isFirstLoad : isFirstLoad, initialModule : initialModule, depth : depth}
			}
		});
	};

	var getDependencies = function(){
		return returnDepsRecursive(getEntryModules(), [], 0);
	};

	var printDependenciesRecursive = function(dependencies, asIframe, result){
		return (result || "") + $.map(dependencies, function(d){
			var printLn;
			if(asIframe){
				printLn = template(rjsProfiler.dependencyHtml, {
					isFirstLoad : d.isFirstLoad,
					"class" :  (d.isFirstLoad ? "firstLoad " : "") + "dependency",
					indent : (d.isFirstLoad ? ">" + Array(d.depth-1).join("\u2014") : Array(d.depth).join("\u2014")),
					name : d.id + (d.isFirstLoad ? ("(" + d.initialModule.timeModule +  "ms/" + d.initialModule.timeSinceFirstModule + "ms)") : "")
				});
			}else{
				printLn = (d.isFirstLoad ? ">" + Array(d.depth-1).join("\u2014") : Array(d.depth).join("\u2014")) + d.id + "\n";
			}				
			if(d.dependencies && d.dependencies.length > 0){
				return printDependenciesRecursive(d.dependencies, asIframe, printLn);
			}else{
				return printLn;
			}
		}).join("");
	};


	//borrowed from xrequire
	function template(contents, data) {
		return contents.replace(tokenRegExp, function (match, token) {
			var result = data[token];

			//Just use empty string for null or undefined
			if (result === null || result === undefined) {
				result = '';
			}

			return result;
		});
	};

	//borrowed from xrequire
	function showHtml(html, asIframe) {

		if(asIframe){
			var iframe = document.createElement("iframe");
			document.body.appendChild(iframe);
			// --
			iframe.style.position    = "absolute";
			iframe.style.zIndex      = 99999;
			iframe.style.background  = "#eee";
			iframe.style.width       = "100%";
			iframe.style.height      = "100%";
			iframe.style.top         = "0px";
			iframe.style.left        = "0px";
			// --
			var iframeDoc = iframe.contentWindow.document;
			iframeDoc.body.innerHTML = html;
		}else{
			//console.log(html);
			//Convert to URL encoded data
			html = encodeURIComponent(html);
			//Display the HTML
			window.open('data:text/html;charset=utf-8,' + html, '_blank');
		}
	};

	//public methoths and attributes
	rjsProfiler = {
		treeHtml: "<!DOCTYPE html>\n<html>\n<head>\n<title>Module Dependencies</title>\n<style>\nbody { font-family: \"Inconsolata\",Andale Mono,Monaco,Monospace;  color: #333; }\n\n.firstLoad{ font-weight: bold; color:#070;}\n\n a {color: #000; text-decoration: none;\n}\n\na:hover {\n    text-decoration: underline;\n}\n\n.mod {\n    background-color: #FAFAFA;\n    border: 1px solid #E6E6E6;\n    border-radius: 5px 5px 5px 5px;\n    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);\n    font-size: 13px;\n    line-height: 18px;\n    margin: 7px 0 21px;\n    overflow: auto;\n    padding: 5px 10px;\n}\n\n.url {\n    font-size: smaller;\n    color: grey;\n}\n\nli.standard {\n    color: grey;\n}\n\n</style>\n</head>\n<body>\n{content}\n</body>\n</html>\n",
		dependencyHtml: "<span class=\"{class}\">{indent} {name}</span><br/>",
		modules : [],
		modulesStore : {},
		showResult : function(){
			var parents = {};

			if(console.table){
				console.table(rjsProfiler.modules, ["id", "timeModule", "timeSinceFirstModule"]);
			}else{
				console.log($.map(rjsProfiler.modules, function(m){
					return  m.id + ": " + m.timeModule + " | " + m.timeSinceFirstModule
				}).join("\n"));
			}
		},
		printDependencyTree : function(asIframe){
			var output = printDependenciesRecursive(getDependencies(), asIframe);
			if(!asIframe){
				console.log(output);
			}else{
				var html = template(rjsProfiler.treeHtml, {
					content: output
				});

				showHtml(html, asIframe);
			}
		}
	};

	//track requireJs module loading
	var initTime;
	requirejs.onResourceLoad = function (context, map, dependencies) {
		initTime = initTime || (new Date()).getTime()
		var id = map.id;
		var modData = {
			id: id,
			timeModule: ((new Date()).getTime() - context.startTime) || 0,
			timeSinceFirstModule: (new Date()).getTime() - initTime || 0,
			map: map,
			dependencies: dependencies,
			context : context
		};
		
		rjsProfiler.modulesStore[id] = modData;
		rjsProfiler.modules.push(modData)
	};

})();