var fs = require('fs');
var path = require('path');
var reactTools = require('react-tools');
var CompositeDisposable = require('atom').CompositeDisposable;

var helpers = {

    fileContents: function (filePath, callback) {
        fs.readFile(filePath, 'utf-8', function (error, data) {

            if (error)
                throw new Error(error);

            else
                callback(data);
        });
    },

    transformEach: function (filesPaths) {

        var compileWithoutNotation = atom.config.get('atom-jsx-transform.compileWithoutNotation');

        filesPaths.forEach(function (path) {

            helpers.fileContents(path, function (content) {

                if (!content)
                    return;

                content = content.trim();

                if (content.indexOf('/** @jsx React.DOM */') === -1 &&
                    compileWithoutNotation) {
                    content = ['/** @jsx React.DOM */\n', content].join('');
                }

                var jsContent = '';
                try {
                    jsContent = reactTools.transform(content, {});

                    // Remove the notation
                    jsContent = jsContent.split('\n').splice(1).join('\n');
                } catch (error) {
                    jsContent = [error.message, '\nfor file ', path].join('');
                };

                var jsFilePath = path.replace('.jsx', '.js');

                fs.writeFile(jsFilePath, jsContent, function (error) {

                    if (error)
                        console.log(['JSX compilation failed for ', path].join(''));

                    else
                        console.log(['Compiled JSX file to ', jsFilePath].join(''));
                });
            });
        });
    },

    transform: function () {
        var activeEditor = atom.workspace.getActiveTextEditor();

        if (activeEditor) {
            var filePath  = activeEditor.getPath();

            if (filePath && filePath.substr(-3) === 'jsx')
                helpers.transformEach([filePath]);
        }
    }

};

var initialConfig = {
    compileOnSave: (localStorage.hasOwnProperty('jsx-compileOnSave') &&
        localStorage.getItem('jsx-compileOnSave') === 'false') ? false : true,
    compileWithoutNotation: (localStorage.hasOwnProperty('jsx-compileWithoutNotation') &&
        localStorage.getItem('jsx-compileWithoutNotation') === 'true') ? true : false
};

module.exports = {
    config: {
        compileOnSave: {
            type: 'boolean',
            default: initialConfig.compileOnSave
        },
        compileWithoutNotation: {
            type: 'boolean',
            default: initialConfig.compileWithoutNotation
        }
    },

    subscriptions: null,
    onSaveSubscription: null,

    activate: function () {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', 'atom-jsx-transform:compile', this.compile));

        if (atom.config.get('atom-jsx-transform.compileOnSave'))
            this.subscribeOnSave();

        atom.config.observe('atom-jsx-transform.compileOnSave', function (value) {

            if (value)
                this.subscribeOnSave();

            else
                this.subscriptions.remove(this.onSaveSubscription);

            window.localStorage.setItem('jsx-compileOnSave', value);

        }.bind(this));

        atom.config.observe('atom-jsx-transform.compileWithoutNotation', function (value) {

            window.localStorage.setItem('jsx-compileWithoutNotation', value);

        }.bind(this));
    },

    compile: function () {
        helpers.transform();
    },

    subscribeOnSave: function () {
        this.onSaveSubscription = atom.commands.add('atom-workspace', 'core:save', this.compile);
        this.subscriptions.add(this.onSaveSubscription);
    },

    deactivate: function () {
        if (this.onSaveSubscription && this.onSaveSubscription.dispose)
            this.onSaveSubscription.dispose();

        this.subscriptions.dispose();
    }
}
