module('lively.morphic.tests.StyleSheetsHTML').requires('lively.morphic.tests.Helper', 'lively.morphic.HTML', 'lively.morphic.StyleSheets', 'lively.morphic.StyleSheetsHTML').toRun(function() {

lively.morphic.tests.MorphTests.subclass('lively.morphic.tests.StyleSheetsHTML.StyleSheets',
'running', {
    setUp: function($super) {
        $super();
    },
},
'testing', {

    assertDOMMorphNodeAttribute: function(targetValue, attributeName, morph, msg) {
        var morphNode = morph.renderContext().morphNode;
        return this.assertEquals(targetValue, $(morphNode).attr(attributeName), msg);
    },
    
    test01SetStyleClassNames: function() {
        
        this.morph.addStyleClassName('test-class');
        this.assertDOMMorphNodeAttribute('Morph test-class', 'class',
            this.morph,
            'Morph has not class names "Morph test-class"');
        this.morph.removeStyleClassName('test-class');
        this.assertDOMMorphNodeAttribute('Morph', 'class',
            this.morph,
            'Morph has not class name "Morph" after removal');
        this.morph.setStyleClassNames(['test-class']);
        this.assertDOMMorphNodeAttribute('Morph test-class', 'class',
            this.morph,
            'Morph has not class names "Morph test-class" after re-set');
    },
    
    test02SetStyleId: function() {
        
        this.morph.setStyleId('test-id');
        this.assertDOMMorphNodeAttribute('test-id', 'id',
            this.morph,
            'Morph has not id "test-id"');
    },

    test03SetStyleSheet: function() {
        this.morph.setStyleSheet('.test-class { color: black;}');
        var styleNode = this.morph.renderContext().styleNode;
        this.assert(styleNode, 'There is no style node in the render context');
        this.assertEquals('style-for-'+this.morph.id, $(styleNode).attr('id'),
            'id of style node is wrong');
        var styleNodeContent = $(styleNode).html()
        console.log(styleNodeContent);
        this.assert(styleNodeContent.indexOf('[morphid="'+this.morph.id.toUpperCase()+'"]') >= 0,
            'Style node content has no ref to morph');
        this.assert(styleNodeContent.indexOf('.test-class') >= 0,
            'Style node content is missing the selector');
        this.assert(styleNodeContent.indexOf('color') >= 0,
            'Style node content is missing the declaration');
    },
    
    
    
    

    
});

}) // end of module