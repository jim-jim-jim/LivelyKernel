module('lively.ide.CodeEditor').requires('lively.morphic.TextCore', 'lively.morphic.Widgets').requiresLib({url: Config.codeBase + 'lib/ace/src-noconflict/ace.js', loadTest: function() { return typeof ace !== 'undefined';}}).toRun(function() {

lively.ide.ace = {
    moduleNameForTextMode: function(textModeName) {
        // currently supported are:
        // "abap", "asciidoc", "c9search", "c_cpp", "clojure", "coffee",
        // "coldfusion", "csharp", "css", "curly", "dart", "diff", "dot",
        // "glsl", "golang", "groovy", "haml", "haxe", "html", "jade", "java",
        // "javascript", "json", "jsp", "jsx", "latex", "less", "liquid",
        // "lisp", "lua", "luapage", "lucene", "makefile", "markdown",
        // "objectivec", "ocaml", "perl", "pgsql", "php", "powershell",
        // "python", "r", "rdoc", "rhtml", "ruby", "scad", "scala", "scss",
        // "sh", "sql", "stylus", "svg", "tcl", "tex", "text", "textile",
        // "typescript", "vbscript", "xml", "xquery", "yaml"
        return "ace/mode/" + textModeName;
    }
}

lively.morphic.Morph.subclass('lively.morphic.CodeEditor',
'settings', {
    style: {
        enableGrabbing: false
    },
    doNotSerialize: ['aceEditor', 'aceEditorAfterSetupCallbacks']
},
'initializing', {
    initialize: function($super, bounds, string) {
        bounds = bounds || lively.rect(0,0,400,300);
        var shape = new lively.morphic.Shapes.External(document.createElement('div'));

        // FIXME those functions should go somewhere else...
        (function onstore() {
            var node = this.shapeNode;
            if (!node) return;
            this.extent = this.getExtent();
        }).asScriptOf(shape);

        (function onrestore() {
            this.shapeNode = document.createElement('div');
            this.shapeNode.style.width = this.extent.x + 'px';
            this.shapeNode.style.height = this.extent.y + 'px';
            this.setExtent(this.extent);
        }).asScriptOf(shape);

        $super(shape);
        this.setBounds(bounds);
        this.textString = string || '';
    },

    onOwnerChanged: function(newOwner) {
        if (newOwner) this.initializeAce();
    }
},
'ace', {
    initializeAce: function() {
        // 1) create ace editor object
        var node = this.getShape().shapeNode,
            e = this.aceEditor = this.aceEditor || ace.edit(node),
            morph = this;
        this.aceEditor.on('focus', function() { morph._isFocused = true; })
        this.aceEditor.on('blur', function() { morph._isFocused = false; })
        node.setAttribute('id', 'ace-editor');
        // 2) set modes / themes
        e.getSession().setMode("ace/mode/javascript");
        this.setStyleSheet('#ace-editor {'
                          + ' position:absolute;'
                          + ' top:0;'
                          + ' bottom:0;left:0;right:0;'
                          + ' font-family: monospace;'
                          + '}');
        this.setupKeyBindings();
        e.setTheme("ace/theme/chrome");

        // 2) run after setup callbacks
        var cbs = this.aceEditorAfterSetupCallbacks;
        if (!cbs) return;
        delete this.aceEditorAfterSetupCallbacks;
        var cb;
        while ((cb = cbs.shift())) { cb(e); }
    },

    addCommands: function(commands) {
        var e = this.aceEditor,
            handler = e.commands,
            platform = handler.platform; // mac or win

        function lookupCommand(keySpec) {
            var binding = e.commands.parseKeys(keySpec),
                command = e.commands.findKeyCommand(binding.hashId, binding.key);
            return command && command.name;
        }

        function addCommands(commandList) {
            // first remove a keybinding if one already exists
            commandList.forEach(function(cmd) {
                var keys = cmd.bindKey && (cmd.bindKey[platform] || cmd.bindKey),
                    existing = keys && lookupCommand(keys);
                if (existing) handler.removeCommand(existing);
            });
            handler.addCommands(commandList);
        }

        addCommands(commands);
    },

    setupKeyBindings: function() {
        this.addCommands([
            // evaluation
            {
                name: 'doit',
                bindKey: {win: 'Ctrl-D',  mac: 'Command-D'},
                exec: this.doit.bind(this, false),
                readOnly: false // false if this command should not apply in readOnly mode
            }, {
                name: 'printit',
                bindKey: {win: 'Ctrl-P',  mac: 'Command-P'},
                exec: this.doit.bind(this, true),
                readOnly: false
            }, {
                name: 'list protocol',
                bindKey: {win: 'Ctrl-Shift-P',  mac: 'Command-Shift-P'},
                exec: this.doListProtocol.bind(this),
                readOnly: false
            },
            // selection / movement
            {
                name: 'clearSelection',
                bindKey: 'Escape',
                exec: this.clearSelection.bind(this),
                readOnly: true
            },
            {
                name: 'moveForwardToMatching',
                bindKey: {win: 'Ctrl-Right',  mac: 'Command-Right'},
                exec: this.moveForwardToMatching.bind(this, false),
                readOnly: true
            }, {
                name: 'moveBackwardToMatching',
                bindKey: {win: 'Ctrl-Left',  mac: 'Command-Left'},
                exec: this.moveBackwardToMatching.bind(this, false),
                readOnly: true
            }, {
                name: 'selectToMatchingForward',
                bindKey: {win: 'Ctrl-Shift-Right',  mac: 'Command-Shift-Right'},
                exec: this.moveForwardToMatching.bind(this, true),
                readOnly: true
            }, {
                name: 'selectToMatchingBackward',
                bindKey: {win: 'Ctrl-Shift-Left',  mac: 'Command-Shift-Left'},
                exec: this.moveBackwardToMatching.bind(this, true),
                readOnly: true
            }]);
    },

    setupRobertsKeyBindings: function() {
        // that.setupKeyBindings()
        var e = this.aceEditor, lkKeys = this;
        this.loadAceModule(["keybinding", 'ace/keyboard/emacs'], function(emacsKeys) {
            e.setKeyboardHandler(emacsKeys.handler);
            var kbd = e.getKeyboardHandler();
            kbd.addCommand({name: 'doit', exec: lkKeys.doit.bind(lkKeys, false) });
            kbd.addCommand({name: 'printit', exec: lkKeys.doit.bind(lkKeys, true)});
            kbd.addCommand({name: 'doListProtocol', exec: lkKeys.doListProtocol.bind(lkKeys)});
            kbd.bindKeys({"s-d": 'doit', "s-p": 'printit', "S-s-p": 'doListProtocol'});
        });
    },

    withAceDo: function(doFunc) {
        if (this.aceEditor) return doFunc(this.aceEditor);
        if (!this.aceEditorAfterSetupCallbacks) this.aceEditorAfterSetupCallbacks = [];
        this.aceEditorAfterSetupCallbacks.push(doFunc);
        return undefined;
    },

    loadAceModule: function(moduleName, callback) {
        return ace.require('./config').loadModule(moduleName, callback);
    },

    indexToPosition: function(absPos) {
        return this.withAceDo(function(ed) { return ed.session.doc.indexToPosition(absPos); });
    }

},
'ace interface', {
    setCursorPosition: function(pos) {
        return this.withAceDo(function(ed) {
            ed.selection.moveCursorToPosition({column: pos.x, row: pos.y}); });
    },

    getCursorPosition: function() {
        return this.withAceDo(function(ed) {
            var pos = ed.getCursorPosition();
            return lively.pt(pos.column, pos.row); });
    },

    moveToMatching: function(forward, shouldSelect, moveAnyway) {
        // This method tries to find a matching char to the one the cursor
        // currently points at. If a match is found it is set as the new
        // position. In case there is no match but moveAnyway is truthy try to
        // move forward over words. A selection range is created when
        // shouldSelect is truthy.
        return this.withAceDo(function(ed) {
            var pos = ed.getCursorPosition(),
                range = ed.session.getBracketRange(pos),
                sel = ed.selection;
            if (!range
              || (forward && !range.isStart(pos.row, pos.column))
              || (!forward && !range.isEnd(pos.row, pos.column))) {
                if (!moveAnyway) return;
                var method = (shouldSelect ? "selectWord" : "moveCursorWord")
                           + (forward ? "Right" : "Left");
                sel[method]();
            } else {
                var to = forward ? range.end : range.start;
                if (!shouldSelect) {
                    sel.moveCursorToPosition(to);
                } else {
                    sel.selectToPosition(to);
                }
            }
        });
    },

    moveForwardToMatching: function(shouldSelect, moveAnyway) {
        this.moveToMatching(true, shouldSelect, moveAnyway);
    },

    moveBackwardToMatching: function(shouldSelect, moveAnyway) {
        this.moveToMatching(false, shouldSelect, moveAnyway);
    },

    clearSelection: function() { this.withAceDo(function(ed) { ed.clearSelection(); }) }

},
'serialization', {
    onLoad: function() {
        this.initializeAce();
    },

    onstore: function($super) {
        $super();
        var self = this;
        this.withAceDo(function(ed) {
            self.storedTextString = ed.getSession().getDocument().getValue();
        });
    },

    onrestore: function($super) {
        $super();
        if (this.storedTextString) {
            this.textString = this.storedTextString;
            delete this.storedTextString;
        }
    }
},
'accessing', {
    getGrabShadow: function() { return null; },
    setExtent: function($super, extent) {
        $super(extent);
        this.withAceDo(function(ed) { ed.resize(); });
        return extent;
    }
},
'event handling', {
    onMouseDown: function($super, evt) {
        // ace installs a mouseup event handler on the document level and
        // stops the event so it never reaches our Morphic event handlers. To
        // still dispatch the event properly we install an additional mouseup
        // handler that is removed immediately thereafter
        var self = this;
        function upHandler(evt) {
            document.removeEventListener("mouseup", upHandler, true);
            lively.morphic.EventHandler.prototype.patchEvent(evt);
            self.onMouseUpEntry(evt);
        }
        document.addEventListener("mouseup", upHandler, true);
        return $super(evt);
    }
},
'text morph eval interface', {

    tryBoundEval: function(string) {
        try {
            return this.boundEval(string);
        } catch(e) {
            return e;
        }
    },

    boundEval: function (str) {
        // Evaluate the string argument in a context in which "this" may be supplied by the modelPlug
        var ctx = this.getDoitContext() || this,
            interactiveEval = function(text) { return eval(text) };
        return interactiveEval.call(ctx, str);
    },

    doit: function(printResult, editor) {
        var text = this.getSelectionOrLineString(),
            sel = editor.selection,
            result = this.tryBoundEval(text);
        if (printResult) {
            sel && sel.clearSelection();
            var start = sel && sel.getCursor();
            editor.onPaste(String(result));
            var end = start && sel.getCursor();
            if (start && end) {
                sel.moveCursorToPosition(start);
                sel.selectToPosition(end);
            }
            // editor.navigateLeft(result.length);
        } else if (sel && sel.isEmpty()) {
            sel.selectLine();
        }
    },

    doListProtocol: function() {
        var pl = new lively.morphic.Text.ProtocolLister(this);
        // FIXME
        pl.createSubMenuItemFromSignature = function(signature, optStartLetters) {
            var textMorph = this.textMorph, replacer = signature;
            if (typeof(optStartLetters) !== 'undefined') {
                replacer = signature.substring(optStartLetters.size());
            }
            // if (textMorph.getTextString().indexOf('.') < 0) {
            //     replacer = '.' + replacer;
            // }
            return [signature, function() {
                // FIXME not sure if this has to be delayed
                (function() {
                    textMorph.focus();
                    textMorph.insertAtCursor(replacer, true);
                    textMorph.focus();
                }).delay(0)
            }]
        }
        pl.evalSelectionAndOpenListForProtocol();
    },

    getDoitContext: function() { return this; }

},
'text morph event interface', {
    focus: function() {
        this.aceEditor.focus();
    },
    isFocused: function() { return this._isFocused }
},
'text morph selection interface', {
    setSelectionRange: function(startIdx, endIdx) {
        this.withAceDo(function(ed) {
            var doc = ed.session.doc,
                start = doc.indexToPosition(startIdx),
                end = doc.indexToPosition(endIdx)
            ed.selection.setRange({start: start, end: end});
        });
    },

    getSelectionRange: function() {
        return this.withAceDo(function(ed) {
            var range = ed.selection.getRange(),
                doc = ed.session.doc;
            return [doc.positionToIndex(range.start), doc.positionToIndex(range.end)];
        });
    },

    selectAll: function() {
        this.withAceDo(function(ed) { ed.selectAll(); });
    },

    getSelectionOrLineString: function() {
        var editor = this.aceEditor, sel = editor.selection;
        if (!sel) return "";
        var range = sel.isEmpty() ? sel.getLineRange() : editor.getSelectionRange();
        return editor.session.getTextRange(range);
    }

},
'text morph syntax highlighter interface', {
    enableSyntaxHighlighting: function() { this.setTextMode('javascript'); },
    disableSyntaxHighlighting: function() { this.setTextMode('text'); },
    setTextMode: function(modeName) {
        var moduleName = lively.ide.ace.moduleNameForTextMode(modeName),
            editor = this.aceEditor;
        this.loadAceModule(["mode", moduleName], function(mode) {
            var doc = editor.getSession().getDocument(),
                newMode = new mode.Mode(),
                newSession = new ace.EditSession(doc, newMode)
            editor.setSession(newSession);
        });
    }
},
'text morph interface', {

    set textString(string) {
        this.withAceDo(function(ed) {
            var doc = ed.getSession().getDocument();
            doc.setValue(string);
        });
        return string;
    },

    get textString() {
        return this.withAceDo(function(ed) {
            var doc = ed.getSession().getDocument();
            return doc.getValue();
        }) || "";
    },

    insertTextStringAt: function(index, string) { throw new Error('implement me'); },
    insertAtCursor: function(string, selectIt, overwriteSelection) {
        this.aceEditor.onPaste(string);
    },

    setFontSize: function(size) {
        this.getShape().shapeNode.style.fontSize = size + 'pt';
        return this._FontSize = size;
    },
    getFontSize: function() { return this._FontSize; },
    setFontFamily: function(fontName) {
        this.getShape().shapeNode.style.fontFamily = fontName;
        return this._FontFamily = fontName;
    },
    getFontFamily: function() { return this._FontFamily; },

    inputAllowed: function() { return this.allowInput },
    setInputAllowed: function(bool) { throw new Error('implement me'); }

});

lively.morphic.World.addMethods(
'tools', {
    addCodeEditor: function(options) {
        options = Object.isString(options) ? {content: options} : {}; // convenience
        var bounds = (options.extent || lively.pt(500, 200)).extentAsRectangle(),
            title = options.title || 'Code editor',
            editor = new lively.morphic.CodeEditor(bounds, options.content || ''),
            pane = this.internalAddWindow(editor, options.title, options.position);;
        editor.setFontFamily('Monaco,monospace');
        editor.setFontSize(Config.get('defaultCodeFontSize'));
        editor.applyStyle({resizeWidth: true, resizeHeight: true});
        editor.accessibleInInactiveWindow = true;
        return pane;
    },

    openWorkspace: function(evt) {
        var window = this.addCodeEditor({
            title: "Workspace",
            content: "nothing",
            syntaxHighlighting: !0
        });
        return window;
    }
});

}); // end of module