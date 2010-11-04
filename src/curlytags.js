/*
 *	curlyTags JavaScript Template Engine v0.9
 *	
 *	Copyright 2010, Anders Mattson
 *	Licensed under the MIT or GPL Version 2 licenses.
 *	
 */

var curlyTags = window.curlyTags || {};

var undefined;

(function(curlyTags){

// Type testing function
curlyTags.is = function(o,t) {
	return Object.prototype.toString.call(o).toLowerCase() === "[object " + t + "]";
};

/*
 * A shamelessly copied version of the jQuery.extend and jQuery.inArray functions
 * by John Resig and the jQuery team http://jquery.com
 */
curlyTags.extend = function() {
	var t = arguments[0] || {}, i = 1, l = arguments.length, d = false, o;
	if ( typeof t === "boolean" ) {
		d = t;
		t = arguments[1] || {};
		i = 2;
	}
	if ( typeof t !== "object" && !curlyTags.is(t,'function') )
		t = {};
	if ( l == i ) {
		t = this;
		--i;
	}
	for ( ; i < l; i++ )
		if ( (o = arguments[ i ]) != null )
			for ( var n in o ) {
				var s = t[ n ], c = o[ n ];
				if ( t === c )
					continue;
				if ( d && c && typeof c === "object" && !c.nodeType )
					t[ n ] = curlyTags.extend( d, s || ( c.length != null ? [ ] : { } ), c );
				else if ( c !== undefined )
					t[ n ] = c;
			}
	return t;
};
	
curlyTags.extend(curlyTags,{
	
	/*
	 * A shamelessly copied version of the jQuery.inArray function
	 * by John Resig and the jQuery team http://jquery.com
	 */
	inArray: function( elem, array ) {
		for ( var i = 0, l = array.length; i < l; i++ )
			if ( array[ i ] === elem )
				return i;
	
		return -1;
	},
	
	/**
	 * Returns a unique id
	 * @param {Object} prefix
	 */
	uuid: function(prefix) {
		prefix = prefix || 'curlytags';
		return prefix + ++curlyTags._uuid;
	},
	
	/**
	 * Constant
	 */
	_uuid: +new Date,
	
	/*
	 * 
	 */
	xhr: window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest(),
	
	/*
	 * Performs all ajax calls and also has built in persistent caching support, depending on the browser.
	 * This makes use of the html5 localStorage feature if the browser supports it (see curlyTags.cache below).
	 */
	ajax: function(url, fn, errfn){
		var data;
		if(data = curlyTags.caching.get(url)) {
			fn(data);
			return;
		}
		
	    var async = true,
	    	errfn = errfn || curlyTags.ajaxError;

	    curlyTags.xhr.open('GET', url, async);
	    curlyTags.xhr.send(null);

	    if (async) {
	        curlyTags.xhr.onreadystatechange = function () {
	            if (curlyTags.xhr.readyState == 4)
	                cb(fn, errfn);
	        };
	    }
		else
	        cb(fn, errfn);
	
	    function cb(fn, errfn) {
	        if (curlyTags.xhr.status >= 200 && curlyTags.xhr.status < 300)
	            fn(curlyTags.caching.set(url, curlyTags.xhr.responseText));
	        else if (typeof(errfn) === 'function')
	            errfn(curlyTags.xhr.status, url);
	    }
	},
	
	/*
	 * The ajax error function gets called if there was an error with the request.
	 * Override this if you do your own error handling.
	 */
	ajaxError: function(status, url) {
		throw new Error("There was an error with the request.");
	},
	
	caching: {
		
		/*
		 * This is used as a storage if the browser doesn't support html5 localStorage, but since 
		 * this is stored in memory this is not persistent between requests.
		 */
		layouts: {},
		
		/*
		 * Function to set a cache object. Usually the url is used as the name and 
		 * the entire content as the string to store.
		 */
		set: function(n, str) {
		
			// TODO: check if item has timed cache command ({% cache [time] %}) and 
			//		 build the functionality for it.
			
			if(typeof localStorage != "undefined"){
				if(str !== null && !curlyTags.re.nocache.test(str)){
					localStorage.setItem(n, str);
					//localStorage.setItem('__v__'+n, N.html_version);
				}
				else
					localStorage.removeItem(n);
			}
			else {
				if(str !== null && !curlyTags.re.nocache.test(str))
					curlyTags.caching.layouts[n] = str;
				else
					curlyTags.caching.layouts[n] = null;
			}
			
			return str;
		},
		
		get: function(n, def) {
			
			// Master override for the caching functionality.
			if(!curlyTags.cache)
				return null;

			var i;
			
			if (typeof localStorage != "undefined") {
				var li = localStorage.getItem(n);
				//var v = localStorage.getItem('__v__'+n);
				//if (li && v && v == N.html_version)
					i = li;
			}
			else 
				i = curlyTags.caching.layouts[n];
				
			return i || def;
		},
		
		clear: function() {
			if (typeof localStorage != "undefined")
				localStorage.clear();
			else 
				curlyTags.caching.layouts = {};
		}
	},

	/**
	 * Contains some regular expressions used by the template engine
	 * plus some functions for handling regular expressions and strings.
	 */
	re: {
		trim_var:				/^\{\{\s*|\s*\}\}$/gi,
		trim:					/^\s+|\s+$/gi,
		blocktag_all:			/\{\%.*?\%\}/gi,
		blocktag:				/\{\%([^\}]+)\%\}/i,
		blocktag2:				/\{\%\s*([^\}\s]+)\s/i,
		trimblock:				/^\{\%\s*|\s*\%\}/gi,
		tag:					/\{\{[^\}]*\}\}/gi,
		varsplit:				/([^\,"]*"(?:[^"\\]*(?:\\.[^"\\]*)*)"\S*|[^\,']*'(?:[^'\\]*(?:\\.[^'\\]*)*)'\S*|\S+)/gi,
		strsplit:				/([^\s"]*"(?:[^"\\]*(?:\\.[^"\\]*)*)"\S*|[^\s']*'(?:[^'\\]*(?:\\.[^'\\]*)*)'\S*|\S+)/gi,
		trimcs:					/^[\s\,]|[\s\,]$/gi,
		trimp:					/^\(|\)$/gi,
		trimq:					/^[\'\"]|[\'\"]$/gi,
		trimend:				/^end/i,
		pairs: {},				// Initialized further down
		include:				/\{\%\s*include\s+['"]*([^\}]+?)['"]*\s*?\%\}/i,
		xtends:					/\{\%\s*extends\s+['"]*([^\}]+?)['"]*\s*?\%\}/i,
		cspl:					/[a-z0-9_]\:/gi,
		pspl:					/[a-z0-9_]\(/gi,
		nocache:				/\{\%\s*nocache\s*\%\}/gi,
		cache:					/\{\%\s*cache\s*([^\}]+)\s*\%\}/i,
		
		/**
		 * Combination of javascript's split and match functions, splits by the regular expression
		 * and returns both the resulting array and the string matching the regexp sorted in the 
		 * correct order.
		 * 
		 * @param {Object} s
		 * @param {Object} regexp
		 */
		splitmatch: function(s, regexp) {
			var ret = [], spl = curlyTags.re.split(s, regexp), match = s.match(regexp), a, b, l;

			if (spl && match) {
				a = spl.length > match.length ? spl : match, b = spl.length < match.length ? spl : match;
				l = a.length;
				for (var i = 0; i < a.length - 1; i++) {
					ret.push(a[i]);
					ret.push(b[i]);
				}

				ret.push(a[l - 1]);
			}
			else if(spl || match)
				ret = spl || match;
			else
				ret.push(s);

			return ret;
		},
		
		_compliantExecNpcg: /()??/.exec("")[1] === undefined, // NPCG: nonparticipating capturing group
		
		/*
		 * Fixes the differences in the native split (using regexp) between different browsers.
		 * Copied this from ???
		 */
		split: function (str, separator, limit) {
		    // if `separator` is not a regex, use the native `split`
		    if (!curlyTags.is(separator, 'regexp'))
		        return String.prototype.split.call(str, separator, limit);
		
		    var output = [],
		        lastLastIndex = 0,
		        flags = (separator.ignoreCase ? "i" : "") +
		                (separator.multiline  ? "m" : "") +
		                (separator.sticky     ? "y" : ""),
		        separator = RegExp(separator.source, flags + "g"), // make `global` and avoid `lastIndex` issues by working with a copy
		        separator2, match, lastIndex, lastLength;
		
		    str = str + ""; // type conversion
		    if (!curlyTags.re._compliantExecNpcg)
		        separator2 = RegExp("^" + separator.source + "$(?!\\s)", flags); // doesn't need /g or /y, but they don't hurt
		
		    if (limit === undefined || +limit < 0)
		        limit = Infinity;
		    else {
		        limit = Math.floor(+limit);
		        if (!limit)
		            return [];
		    }
		
		    while (match = separator.exec(str)) {
		        lastIndex = match.index + match[0].length; // `separator.lastIndex` is not reliable cross-browser
		
		        if (lastIndex > lastLastIndex) {
		            output.push(str.slice(lastLastIndex, match.index));
		
		            // fix browsers whose `exec` methods don't consistently return `undefined` for nonparticipating capturing groups
		            if (!curlyTags.re._compliantExecNpcg && match.length > 1) {
		                match[0].replace(separator2, function () {
		                    for (var i = 1; i < arguments.length - 2; i++)
		                        if (arguments[i] === undefined)
		                            match[i] = undefined;
		                });
		            }
		
		            if (match.length > 1 && match.index < str.length)
		                Array.prototype.push.apply(output, match.slice(1));
		
		            lastLength = match[0].length;
		            lastLastIndex = lastIndex;
		
		            if (output.length >= limit)
		                break;
		        }
		
		        if (separator.lastIndex === match.index)
					separator.lastIndex++; // avoid an infinite loop
		    }
		
		    if (lastLastIndex === str.length) {
				if (lastLength || !separator.test("")) 
					output.push("");
			}
			else
				output.push(str.slice(lastLastIndex));
		
		    return output.length > limit ? output.slice(0, limit) : output;
		}
	},
	
	/**
	 * Determines if the template engine should render the root 
	 * (defaults to document.body) with the window object as data object on load.
	 * 
	 * @param {Object} O
	 */
	autoload: true,
	
	/**
	 * Determines if the head content should be included when extending a document
	 */
	fullextend: true,
	
	/**
	 * Wether inline style tags and linked stylesheets should be parsed or not. In some browsers (IE) this
	 * creates one more trip to the server.
	 */
	parsecss: true,
	
	/**
	 * Wether linked css files should be parsed or not. In some browsers (IE) the linked stylesheets
	 * must on the same domain and every link creates another roundtrip to the server.
	 * This is only valid if parsecss is set to true.
	 */
	parselinks: true,
	
	/**
	 * The root which to use for rendering if autoload is set to true.
	 * null means that the document.body (default) will be used.
	 */
	root: null,
	
	/**
	 * The data object to use for auto rendering. null means use the 
	 * default window object.
	 */
	data: null,
	
	/**
	 * Internal variable that holds the prerendered html for the root object
	 * if it needs rerendering.
	 */
	_originalroot: null,
	
	/**
	 * The default setting for the cache function. The template files can override
	 * an this by using the {% nocache %} and {% cache [time] %} block tags.
	 * Default behaviour is to cache everything.
	 * This can also be set to false with the url parameter 'cache=0' 
	 */
	cache: true,
	
	/**
	 * Register one or more new block tags or filters.
	 */
	register: function(O) {
		
		var o;
		
		if(!curlyTags.is(O,'array'))
			O = [O];
		
		for(var i in O) {
			o = O[i];
			if(o.type == 'filter')
				curlyTags.filters[o.name] = o.fn;
			else {
				curlyTags.blocktags[o.name] = o.fn;
				if(o.type == 'block') {
					curlyTags.defs.startblocks.push(o.name);
					curlyTags.defs.endblocks.push("end"+o.name);
					curlyTags.re.pairs['end'+o.name] = new RegExp("/^\{\%\s*" + o.name + "\s+/", "i");
					if (o.elseblock) {
						curlyTags.defs.elseblocks[o.name] = new RegExp("/\{\%\s*" + o.elseblock + "\s*\%\}/", "gi");
						if(curlyTags.defs.elsenames.indexOf(o.elseblock)==-1)
							curlyTags.defs.elsenames.push(o.elseblock);
					}
				}
			}
		}
	},
	
	/**
	 * Adds data to the data object that is used by the template engine.
	 * This or the replaceData function, depending on the need, can be used in JSONP calls.
	 */
	loadData: function(d) {
		curlyTags.data = curlyTags.extend(curlyTags.data || {}, d);
	},
	
	/*
	 * Replaces the data object this is used by the template engine.
	 * This or the loadData function, depending on the need, can be used in JSONP calls.
	 */
	replaceData: function(d) {
		curlyTags.data = d;
	},
	/**
	 * Some definitions for the initial block tags and filters.
	 * Further initializations are performed further down.
	 */
	defs: {
		startblocks: [],
		endblocks: [],
		elseblocks: {
			"for": 			/\{\%\s*empty\s*\%\}/gi,
			"if": 			/\{\%\s*else\s*\%\}/gi,
			"ifequal": 		/\{\%\s*else\s*\%\}/i,
			"ifnotequal": 	/\{\%\s*else\s*\%\}/i,
			"ifchanged": 	/\{\%\s*else\s*\%\}/i
		},
		elsenames: ["else","empty"]
	},
	
	/**
	 * This is the backbone of the template engine. It parses a template string 
	 * into a possibly nested array of block objects which can be further processed.
	 * @param {Object} str
	 */
	strtolex: function(str) {
		
		var b, lex = [], tag, block, elsetag, elsecontent, eltag, push, cur, vars,
			B = curlyTags.is(str,"string") ? curlyTags.re.splitmatch(str, curlyTags.re.blocktag_all) : str;

		while(B.length){
			b = B.shift();
			if(curlyTags.is(b,"string") && b.indexOf("{%") == 0) {
				
				tag = b.match(curlyTags.re.blocktag2);
				
				if(tag[1]){
					if(curlyTags.inArray(tag[1],curlyTags.defs.endblocks) > -1){
						block = [];
						elsetag = curlyTags.defs.elseblocks[tag[1].replace(curlyTags.re.trimend, '')];
	
						elsecontent = [], push = true, eltag = null;
						while (lex.length) {
							cur = lex.pop();
							if (curlyTags.is(cur, "string")) {
								if (cur.match(curlyTags.re.pairs[tag[1]])) {
									lex.push({
										type: 			tag[1].replace(/^end/i, ''),
										condition: 		cur.replace(curlyTags.re.trimblock, '').replace(tag[1].replace(curlyTags.re.trimend, ''), '').replace(curlyTags.re.trim, ''),
										content: 		curlyTags.strtolex(block),
										elsecontent: 	elsecontent.length ? curlyTags.strtolex(elsecontent) : null,
										elsetag: 		eltag,
										endtag: 		tag[1]
									});
									break;
								}
								else if (elsetag && cur.match(elsetag)) {
									eltag = cur;
									elsecontent = block;
									block = [];
									push = false;
								}
							}
							if (push) 
								block.unshift(cur);
							push = true;
							
						}
					}
					else if(curlyTags.inArray(tag[1], curlyTags.defs.startblocks)>-1 || curlyTags.inArray(tag[1], curlyTags.defs.elsenames) > -1)
						lex.push(b);
					else {
						vars = curlyTags.strsplit(b.replace(curlyTags.re.trimblock,''));
						vars.shift();
						lex.push({
							type: tag[1],
							vars: vars
						});
					}
				}
			}
			else 
				lex.push(b);
		}
		return lex;
	},
	
	/**
	 * This does the opposite of strtolex, creating a template string
	 * from a nested array of block objects.
	 * @param {Object} lex
	 */
	lextostr: function(lex) {
		var out = [], l = lex.length;
		
		for(var i = 0; i < l; i++) {
			if(curlyTags.is(lex[i], "string"))
				out.push(lex[i]);
			else if(lex[i].vars)
				out.push('{% ' + lex[i].type + ' ' + lex[i].vars.join(' ') + ' %}');
			else {
				out.push('{% ' + lex[i].type + ' ' + lex[i].condition + ' %}');
				out.push(curlyTags.lextostr(lex[i].content));
				
				if(lex[i].elsetag) {
					out.push(lex[i].elsetag);
					if(lex[i].elsecontent)
						out.push(curlyTags.lextostr(lex[i].elsecontent));
				}
				
				out.push('{% ' + lex[i].endtag + ' %}');
			}
		}
		
		return out.join('');
	},
	
	/**
	 * Renders a template string using the accompanied data.
	 * 
	 * @param {Object} str
	 * @param {Object} d1
	 * @param {Object} d2
	 */
	render_string: function(str, d1, d2) {
		
		var out = [], lex;

		if (curlyTags.is(str, "string")) {
			if(!str.length)
				return str;
			lex = curlyTags.strtolex(str);
		}
		else 
			lex = str;

		if(d2)
			curlyTags.extend(d1, d2);
		
		for(var c in lex) {
			if(curlyTags.is(lex[c], "string"))
				out.push(curlyTags.parsevar(lex[c], d1));
			else {
				if(!curlyTags.blocktags[lex[c].type])
					throw new Error("Template error: blocktag '" + lex[c].type + "' does not exist");
				out.push(curlyTags.blocktags[lex[c].type].call(lex[c], lex[c].vars, d1));
			}
		}
		return out.join('');
	},
	
	/**
	 * Parse a variable name from a string using the accompanied data.
	 * 
	 * @param {Object} d
	 * @param {Object} d1
	 * @param {Object} d2
	 */
	parsevar: function(d, d1, d2) {

		if (d2) 
			curlyTags.extend(d1, d2);
		
		var tags = d.match(curlyTags.re.tag);

		if(tags)
			for(var i = 0, l = tags.length; i < l; i++)
				d = d.replace(tags[i], curlyTags._parsevar(tags[i].replace(curlyTags.re.trim_var, ''), d1));

		return d;
	},
	
	/**
	 * Internal support function to parsevar.
	 * 
	 * @param {Object} tagstr
	 * @param {Object} d1
	 */
	_parsevar: function(tagstr, d1) {
		
		var sfn, fn_parts, fnname, sfn_parts, args, parts = tagstr.split('|');
		var value = curlyTags.evalvar(parts.shift(), d1);
		
		if (value === null) value = '';
		
		if(parts.length) {
			while(sfn = parts.shift()) {
				sfn = sfn.replace(curlyTags.re.trim, '');
				if(sfn.match(curlyTags.re.pspl)) {
					fn_parts = sfn.split('(');
					fnname = fn_parts.shift();
					sfn = fn_parts.join('');
					sfn_parts = [value];
					args = curlyTags.varssplit(sfn.replace(curlyTags.re.trimp,''));
					for (var j = 0; j < args.length; j++) {
						args[j] = curlyTags.evalvar(args[j], d1);
						sfn_parts.push(args[j]);
					}
					value = curlyTags.filters[fnname.replace(curlyTags.re.trim, '')].apply(N, sfn_parts);
				}
				else if (sfn.match(curlyTags.re.cspl)) {
					fn_parts = sfn.split(':');
					fnname = fn_parts[0];
					args = curlyTags.evalvar(fn_parts[1], d1);
					value = curlyTags.filters[fnname.replace(curlyTags.re.trim, '')].apply(N, [value, args]);
				}
				else
					value = curlyTags.filters[sfn](value);
			}
		}
		return value;
	},
	
	/**
	 * Renders a template url with the accompanied data and executes a callback when finished.
	 * @param {Object} u
	 * @param {Object} D
	 * @param {Object} f
	 */
	render: function(u, D, f) {
		curlyTags.ajax( u, function( d ) {
			curlyTags.render_string_c(d, D, f);
		});
	},
	
	/**
	 * Renders a template string with the accompanied data and executes a callback when finished.
	 * The reason for using a callback function as opposed to just returning the value is
	 * the template inheritance.
	 * @param {Object} str
	 * @param {Object} D
	 * @param {Object} fn
	 */
	render_string_c: function(str, D, fn) {
		var include, xtends;

		if(curlyTags.is(D,'function')) {
			fn = D;
			D = {};
		}
		
		if(xtends = str.match(curlyTags.re.xtends)) {
			curlyTags.ajax(xtends[1], function(d){

				// If this is a document and it inherits another document (rather than being just a string)
				// we need to transfer the head info (links, scripts and styles) to 
				// the current document.
				// For now, this only happens if the document is autoloaded.
				if(curlyTags.fullextend && curlyTags.autoload && (d.toUpperCase().indexOf('<!DOCTYPE') === 0)) {
					var body, head = "";
					
					// Parse the header content and add it to the bottom of the document.
					// It's done this way (not parsing it and adding it to the header) to keep
					// the code footprint to a minimum.
					//
					// TODO: investigate this method of adding the header content further.
					head = d.match(/\<head[^\>]*?\>([\s\S]*?)\<\/head\>/i);
					if(head) {
						var frag = document.createElement('div');
						frag.innerHTML = head[1];
						var headelem = document.getElementsByTagName("head")[0];

						while(frag.childNodes.length)
							headelem.insertBefore(frag.lastChild, headelem.firstChild);
					}
					
					body = d.match(/<body[^>]*?>([\s\S]*?)<\/body>/);
					if(body)
						d = body[1];
				}
				else if(d.toUpperCase().indexOf('<!DOCTYPE') === 0) {
					body = d.match(/<body[^>]*?>([\s\S]*?)<\/body>/);
					if(body)
						d = body[1];
				}
				
				// Don't want to overwrite ourself.
				var self;
				if(self = d.match(/<script[^>]*?src="[^"]*?bam.tpl.js[^"]*?"[^>]*?>(<\/script>)?/i))
					d = d.replace(self[0], '');
				
				var base = curlyTags.strtolex(d),
					xt = curlyTags.strtolex(str),
					blocks = {};
				
				str = str.replace(xtends[0], '');
				
				for (var i in xt)
					if(xt[i].type == "block")
						blocks[xt[i].condition] = xt[i].content;
				
				// Handle the replacement of block tags
				str = curlyTags.lextostr(curlyTags.replace_blocks(base, blocks));
				
				curlyTags.render_string_c(str, D, fn);
			});
		}
		else if (include = str.match(curlyTags.re.include)) {
			curlyTags.ajax(include[1], function(d){
				curlyTags.render_string_c(str.replace(include[0], d), D, fn);
			});
		}
		else if(fn)
			fn(curlyTags.render_string(str, D));
	},
	
	/**
	 * Internal recursive function used to replace blocks in the template string.
	 * @param {Object} c
	 * @param {Object} b
	 */
	replace_blocks: function(c, b) {
		for (var i in c)
			if(!curlyTags.is(c[i], "string") && c[i].type == "block")
				c[i].content = (b[c[i].condition]) ? b[c[i].condition] : curlyTags.replace_blocks(c[i].content, b);
		return c;
	},
	
	/**
	 * Object containing definitions of the basic filters included.
	 * See the Django template engine documentation for more details on these.
	 */
	filters: {
		add: function(v, a) {
			return v*1 + a;
		},
		
		addslashes: function(v) {
			return v.replace(/\"/gi,'\\"').replace(/\'/gi, "\\'");
		},
		
		lower: function(v) {
			return v.toLowerCase();
		},
		
		capfirst: function(v) {
			return v.substring(0,1).toUpperCase() + v.substring(1);
		},
		
		cut: function(v, c) {
			return v.replace(new RegExp(c,"gi"),"");
		},
		
		"default": function(v, d) {
			return v ? v : d;
		},
		
		default_if_none: function(v, d) {
			return v !== null ? v : d;
		},
		
		default_if_null: function(v, d) {
			return v !== null ? v : d;
		},
		
		dictsort: function(d, f, i) {
			i = i || 1;
			return d.sort(function(a,b) {
				return a[f] == b[f] ? 0 : a[f] < b[f] ? -1*i : 1*i;
			});
		},
		
		dictsortreversed: function(d, f) {
			return curlyTags.filters.dictsort(d, f, -1);
		},
		
		divisibleby: function(v, c) {
			return (v*1+"") == v ? v*1 % c == 0 : false;
		},
		
		filesizeformat: function(v) {
			var r = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'], i = 0, c = v;
			
			while(c > 1024 && i++ < 5)
				c = c / 1024;
			
			return curlyTags.filters.floatformat(c,'-1') + ' ' + r[i];
		},
		
		first: function(v) {
			return v[0];
		},
		
		fix_ampersands: function(v) {
			return v.replace(/\&/g, '&amp;');
		},
		
		floatformat: function(v, f) {
			f = f*1 || -1;
			var s = Math.min(32,Math.abs(f)), 
				e = Math.pow(10,s), 
				a="00000000000000000000000000000000",
				r = Math.round(v*e)/e;
			return (f > 0 && Math.round(r) == r) ? Math.round(r) + "." + a.substring(0,s) : r;
		},
		
		get_digit: function(v, d) {
			if (curlyTags.is(v,"number")) {
				v = Math.floor(v)+"";
				return (d > v.length || v < 1) ? 0 : (d < 1) ? v : v[v.length-d];
			}
			return v;
		},
		
		join: function() {
			var out = [], v, s = arguments[arguments.length-1];
			
			if(curlyTags.is(arguments[0],'array'))
				return arguments[0].join(s);
			
			for(var i = 0; i < arguments.length-1; i++)
				if(arguments[i]) out.push(arguments[i]);

			return out.join(s);
		},

		last: function(v) {
			return v[v.length-1];
		},
		
		length: function(v) {
			return v.length;
		},
		
		length_is: function(v, n) {
			return v.length == n;
		},
		
		linebreaks: function(v) {
			var p = v.split(/\n\s*\n/gi);
			
			if(p.length > 1)
				v = p.join('</p><p>');
			
			return '<p>' + v.replace(/\n/gi, '<br />') + '</p>';
		},
		
		linebreaksbr: function(v) {
			return v.replace(/\n/gi, '<br />');
		},
		
		make_list: function(v) {
			var V = v+"", out = [];
			if(curlyTags.is(v, "number"))
				for(var i in V)
					out.push(V[i]*1);
			else
				for(var i in V)
					out.push(V[i]);
			return out;
		},
		
		pluralize: function(v, p) {
			v = Math.min(2,v);
			var l = ['s', '', 's'];
			if (p) {
				var P = p.split(',');
				l = P.length > 1 ? [P[1], P[0], P[1]] : [p, '', p];
			}
			return l[v];
		},
		
		random: function(l) {
			return l[Math.round(Math.random()*(l.length-1))];
		},
		
		removetags: function(v, l) {
			var L = l ? l.split(" ") : ['[a-z_]+'];
			for(var i in L)
				v = v.replace(new RegExp('\<'+L[i]+'[^\>]*\>|\<\/'+L[i]+'\>', 'gi'), '');
			return v;
		},
		
		slugify: function(v) {
			return v.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_\-]/g,'');
		},
		
		striptags: function(v) {
			return curlyTags.filters.removetags(v);
		},
		
		upper: function(v) {
			return v.toUpperCase();
		},

		or: function(v,v2) {
			return v || v2;
		},

		trans: function(v) {
			return curlyTags.i18n.get(v, true);
		},
		
		replace: function(v, s1, s2) {
			return v.replace(s1, s2);
		}
	},
	
	/**
	 * Object containing definitions of the basic blocks included.
	 * See the Django template engine documentation for more details on these.
	 */
	blocktags: {
		
		// The nocache and cache block tags are really parsed during the ajax function calls.
		nocache: function(a, d) {
			return "";
		},
		
		cache: function(a, d) {
			return "";
		},
		
		block: function(a, d){
			return curlyTags.render_string(this.content, d);
		},
		
		"if": function(a, d) {
			var cond,
				_not = false,
				ctype = "",
				conds = this.condition.split(/\s+(?:or|and)\s+/gi);
			
			if ( this.condition.indexOf(" or ") > -1 )
				ctype = "or";
			else if ( this.condition.indexOf(" and ") > -1 )
				ctype = "and";
			
			for (var i = 0; i < conds.length; i++) {
				var _c = (conds[i].indexOf('not ') > -1) ? !curlyTags.evalvar(curlyTags.strsplit(conds[i])[1], d) : curlyTags.evalvar(conds[i], d);

				if(curlyTags.is(_c, "array") && _c.length == 0)
					_c = false;
				
				cond = (ctype == "" || cond == undefined) ? _c : (ctype == "or") ? (cond || _c) : (cond && _c); 
			}
			
			return curlyTags.render_string(cond ? this.content : (this.elsecontent || ""), d); 
		},
		
		ifequal: function(a, d) {
			var vars = curlyTags.strsplit(this.condition);
			
			if(curlyTags.evalvar(vars[0], d) == curlyTags.evalvar(vars[1], d))
				return curlyTags.render_string(this.content, d);
			else if(this.elsecontent)
				return curlyTags.render_string(this.elsecontent, d);

			return "";
		},
		
		"for": function(a, d) {
			var vars = this.condition.split(' in '), out = [];

			if(vars.length < 2) 
				throw new Error("Template error: for blocktag expects a string on the format 'for name in list'");
							
			var fd = curlyTags._parsevar(vars[1], d);
			if (!fd) {
				if(this.elsecontent)
					out.push(curlyTags.render_string(this.elsecontent, d));
			}
			else {
				var vn, dn, dO, ns;
				if (vars[0].indexOf(',')>-1) {
					ns = vars[0].split(',');
					vn = ns[0].replace(curlyTags.re.trim,'');
					dn = ns[1].replace(curlyTags.re.trim,'');
				}
				else
					dn = vars[0].replace(curlyTags.re.trim,'');

				dO = {
					forloop:{
						counter:1,
						counter0:0,
						last:null,
						ifchangedcounter:-1,
						ifchangedcontent:[]
					}
				};
				
				if(d.forloop)
					dO.forloop.parentloop = d.forloop;

				for(var _var in fd) {
					dO[vn] = _var;
					dO[dn] = fd[_var];

					out.push(curlyTags.render_string(this.content, d, dO));

					dO.forloop.counter++;
					dO.forloop.counter0++;
					dO.forloop.last = {key:_var, val:fd[_var]};
					dO.forloop.ifchangedcounter = 0;
				}
				
				if(d.forloop)
					d.forloop = dO.forloop.parentloop;
				
				return out.join('');
			}
		},
		
		ifnotequal: function(a, d) {
			var vars = curlyTags.strsplit(this.condition);

			if(curlyTags.evalvar(vars[0], d) != curlyTags.evalvar(vars[1], d))
				return curlyTags.render_string(this.content, d);
			else if(this.elsecontent)
				return curlyTags.render_string(this.elsecontent, d);

			return "";
		},
		
		ifchanged: function(a, d) {
			var icc = curlyTags.render_string(this.content, d);
			var comp;
			if(!d.forloop)
				return icc;
			else {
				if(this.condition) {
					var vars = curlyTags.strsplit(this.condition), iccvars = [];
					for (var v in vars)
						iccvars.push(curlyTags.evalvar(vars[v], d));
					comp = iccvars.join('|');
				}
				else
					comp = icc;
				
				if(d.forloop.ifchangedcounter == -1) {
					d.forloop.ifchangedcontent.push(comp);
					d.forloop.ifchangedcounter++;
					d.forloop.ifchangedcounter++;
					return icc;
				}
				else {
					if (comp != d.forloop.ifchangedcontent[d.forloop.ifchangedcounter]) {
						d.forloop.ifchangedcontent[d.forloop.ifchangedcounter] = comp;
						d.forloop.ifchangedcounter++;
						return icc;
					}
					else if (this.elsecontent) 
						d.forloop.ifchangedcounter++;
						return curlyTags.render_string(this.elsecontent, d);
				}
			}
		},
		
		comment: function(){
			return "";
		},
		
		firstof: function(A, d) {
			for(var a in A)
				if(curlyTags.evalvar(A[a],d))
					return curlyTags.evalvar(A[a],d);

			return curlyTags.evalvar(A[A.length-1],d);
		},

		trans: function(a, d) {
			return curlyTags.i18n.get(curlyTags.evalvar(a[0], d));
		},
		
		// load is not yet implemented, not sure if it will be.
		load: function(a, d) {
			return "";
		},
		
		include: function(a, d) {
			return "{% include " + a[0] + " %}";
		},
		
		cycle: function(a, d) {
			return curlyTags.evalvar(a.length ? a[(d.forloop ? d.forloop.counter0 : 0) % a.length] : a, d);
		},

		spaceless: function(a, d) {
			return curlyTags.render_string(this.content, d).replace(/\>\s+\</gi, '><');
		},
		
		widthratio: function(a, d) {
			return Math.round(curlyTags.evalvar(a[0], d)/curlyTags.evalvar(a[1], d)*curlyTags.evalvar(a[2], d));
		},
		
		"with": function(a, d) {
			var vars = this.condition.split('as'), dO = {};
			
			if(vars.length > 1)
				dO[vars[1].replace(curlyTags.re.trim, '')] = curlyTags.evalvar(vars[0], d);
			else
				dO = curlyTags.evalvar(vars[0], d);
			
			return curlyTags.render_string(this.content, curlyTags.extend({}, d, dO));
			
		},
		
		templatetag: function(a, d) {
			return ({
				openblock: 		"{%",
				closeblock: 	"%}",
				openvariable: 	"{{",
				closevariable: 	"}}",
				openbrace: 		"{",
				closebrace: 	"}",
				opencomment: 	"{#",
				closecomment: 	"#}"			
			})[a[0]];
		},
		
		filter: function(a, d) {
			var c = curlyTags.render_string(this.content, d),
				n = curlyTags.uuid(),
				o = {};
			o[n] = c;
			return curlyTags.render_string("{{ "+n+"|"+this.condition+" }}",o);
		}

	},

	/**
	 * Internal function for parsing a string representation of a function call.
	 * This is used in filters, to parse for example the string "get_digit(4)"
	 * into a function call to the function get_digit with the parameter 4.
	 * 
	 * @param {Object} v
	 */
	varssplit: function(v) {
		var L = v.match(curlyTags.re.varsplit), o =[], v, l = L.length;
		for (var i = 0; i < l; i++) {
			v = L[i].replace(curlyTags.re.trimcs, '');
			if(v) 
				o.push(v);
		}
		return o;
	},
	
	/**
	 * Correctly parses a string of strings (even if they contain quotation marks).
	 * @param {Object} v
	 */
	strsplit: function(v) {
		var S = v.match(curlyTags.re.strsplit), o = [];

		for(var i = 0, s = S.length; i < s; i++)
			if(S[i].replace(curlyTags.re.trim, ''))
				o.push(S[i]);

		return o;
	},
	
	/**
	 * Evaluates a string representation of a variable against a data object.
	 * 
	 * @param {Object} v
	 * @param {Object} d
	 */
	evalvar: function(v, d) {
		v = v.replace(curlyTags.re.trim, '');
		
		// Keyword __all__ means the current data object. This is useful
		// when creating, say, a custom tag function for an input that's connected to a 
		// model and the current data object represents that model.
		// Instead of sending every field to that tag function, 
		// you can just send the name of the field, for instance, and the complete model 
		// object to get other values from.
		if (v == '__all__') 
			return d;
		
		// Boolean values
		else if (v.toLowerCase() == "true") 
			return true;
		
		else if (v.toLowerCase() == "false") 
			return false;
		
		// String value
		else if (v.substring(0, 1) == '"' || v.substring(0, 1) == "'") 
			v = v.replace(curlyTags.re.trimq, '');
		
		// Integer/float value
		else if (v * 1 + '' === v) 
			v = v * 1;
		
		// Data values
		else if (v.indexOf('.') > -1) {
			var vs = v.split('.');
			
			if (vs[0] == '__all__') 
				vs.shift();
			
			else if(vs[0] == 'user'){
				vs.shift();
				d = curlyTags.user.prefs;
			}
			
			v = d[vs.shift()];
			
			if (v == undefined) 
				return null;
			
			var V;
			while (V = vs.shift()) 
				v = v[V];
		}
		else
			v = d[v] || '';
		
		return v;
	},
	
	/**
	 * Parse the parameters sent to block tags.
	 * 
	 * @param {Object} arr
	 * @param {Object} d
	 */
	parseblockvars: function(arr, d){
		var out = [], val, name, spl;
		for(var a in arr) {
			if(arr[a].indexOf(':')>-1) {
				spl = arr[a].split(':');
				val = curlyTags.evalvar(spl[1], d);
				out[spl[0]] = val;
				out.push(val);
			}
			else
				out.push(curlyTags.evalvar(arr[a], d));
		}
		return out;
	},
	
	/**
	 * Support function for the trans filter.
	 * @param {Object} s
	 */
	i18n: {
		currentLanguage: 'sv',
		get: function(s) {
			return (curlyTags.i18n.defs[curlyTags.i18n.currentLanguage][s.toUpperCase()] || s);
		},
		set: function(n, v, l) {
			l = l || curlyTags.i18n.currentLanguage;
			if(!curlyTags.i18n.defs[l])
				curlyTags.i18n.defs[l] = [];
			curlyTags.i18n.defs[l][n.toUpperCase()] = v;
		},
		defs: []
	}
});


// Some initializations
var S = 'if,ifequal,ifnotequal,for,comment,form,with,ifchanged,spaceless,filter,block'.split(',');
for(var s in S){
	curlyTags.re.pairs['end'+S[s]] = new RegExp('^\\{\\%\\s*' + S[s] + '\\s+', 'i');
	curlyTags.defs.startblocks.push(S[s]);
	curlyTags.defs.endblocks.push('end'+S[s]);
}


// The document.ready functionality is needed for autoloading
(function(fn) {
	var u = navigator.userAgent;
	var e = /*@cc_on!@*/false; 
	if(/webkit/i.test(u)){
		setTimeout(function(){
			if(document.readyState == "loaded" || document.readyState == "complete") fn();
			else setTimeout(arguments.callee, 10);
		},10);
	}
	else if ((/mozilla/i.test(u) && !/(compati)/.test(u)) || (/opera/i.test(u)))
		document.addEventListener("DOMContentLoaded", fn, false);
	else if (e) {
		(function(){
			var t = document.createElement('doc:rdy');
			try {
				t.doScroll('left');
				t = null;
			} 
			catch (E) {
				setTimeout(arguments.callee, 0);
				return;
			}
			fn();
		})();
	}
	else 
		window.onload = fn;
})(function(){
	
	var head = document.getElementsByTagName('head')[0];
	
	// Reading some url parameters
	var scripts = document.getElementsByTagName("script");
	for(var i = 0, l = scripts.length; i < l; i++) {
		if(scripts[i].src && scripts[i].src.indexOf('curlytags.js?') > -1) {
		
			if(scripts[i].src.indexOf('autoload=0') > -1)
				curlyTags.autoload = false;
		
			if(scripts[i].src.indexOf('fullextend=0') > -1)
				curlyTags.fullextend = false;

			if(scripts[i].src.indexOf('cache=0') > -1)
				curlyTags.cache = false;
		
			break;
		}
	}
	
	
	// Autoload is turned on by default
	if(curlyTags.autoload){
		
		var root = curlyTags.root || document.body;
		curlyTags._originalroot = root.innerHTML;
		
		curlyTags.render_string_c(root.innerHTML, curlyTags.data || window, function(str){
			root.innerHTML = str;
			document.body.style.visibility = 'visible';

	
			// If parse links is turned on, external css is also processed.
			if(curlyTags.parselinks) {
				var links = document.getElementsByTagName("link"), node;
				if(links) {
					for(var o = 0, l = links.length; o < l; o++){
						node = links[o];
						if(node && node.rel == "stylesheet") {
	 						curlyTags.ajax(node.href, function(d){
								var style = document.createElement("style");
								node.parentNode.replaceChild(style, node);
								if(style.styleSheet)
									style.styleSheet.cssText = curlyTags.render_string(d, curlyTags.data || window);
								else
									style.appendChild(document.createTextNode(curlyTags.render_string(d, curlyTags.data || window)));
							});
						}
					}
				}
			}

			// Parsing styletags is on by default
			// TODO: check if every browser has the innerHTML attribute on style tags. 
			if(curlyTags.parsecss) {

				if(styles = document.getElementsByTagName("style")) {
					for(var s = 0, l = styles.length; s < l; s++) {
						if(styles[s].styleSheet)
							styles[s].styleSheet.cssText = curlyTags.render_string(styles[s].innerHTML, curlyTags.data || window);
						else
							styles[s].textContent = curlyTags.render_string(styles[s].innerHTML, curlyTags.data || window);
					}
				}
			}
		});
	}
	else
		document.body.style.visibility = 'visible';
});

})(curlyTags);

// Really don't like this one but it's the only way I found to keep the content from flicker on load.
document.write("<style>body{visibility: hidden;}</style>");