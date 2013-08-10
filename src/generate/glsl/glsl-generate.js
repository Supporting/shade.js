(function (ns) {

    var Annotation = require("./../../base/annotation.js").Annotation;
    var FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;
    var Types = require("./../../interfaces.js").TYPES;
    var Kinds = require("./../../interfaces.js").OBJECT_KINDS;
    var walk = require('estraverse'),
        Syntax = walk.Syntax,
        VisitorOption = walk.VisitorOption;




    /**
     * @param {object} opt
     */
    var getHeader = function (opt) {
        if (opt.omitHeader == true)
            return;
        var header = [
            "// Generated by shade.js"
        ];
        var floatPrecision = opt.floatPrecision || "mediump";
        header.push("precision " + floatPrecision + " float;");
        return header;
    }

    var toGLSLType = function (info) {
        switch (info.type) {
            case Types.OBJECT:
                switch (info.kind) {
                    case Kinds.COLOR:
                        return "vec4";
                    case Kinds.FLOAT3:
                        return "vec3";
                    case Kinds.FLOAT2:
                        return "vec2";
                    default:
                        throw new Error("toGLSLType: Unhandled kind: " + info.kind);
                }
            case Types.UNDEFINED:
                return "void";
            case Types.NUMBER:
                return "float";
            default:
                throw new Error("toGLSLType: Unhandled type: " + info.type);

        }

    }

    var generate = function (ast, opt) {

        opt = opt || {};

        var indent = "";
        var lines = [];
        function appendLine(line){
            lines.push(indent + line);
        }
        function changeIndention(add){
            while(add > 0){
                indent += "    "; add--;
            }
            if(add < 0){
                indent = indent.substr(0, indent.length + add*4);
            }
        }

        walk.traverse(ast, {
                enter: function (node) {
                    var type = node.type;
                    switch (type) {


                        case Syntax.Program:
                            lines = lines.concat(getHeader(opt));
                            break;


                        case Syntax.FunctionDeclaration:
                            var func = new FunctionAnnotation(node);
                            var methodStart = [toGLSLType(func.getReturnInfo())];
                            methodStart.push(node.id.name, '(');
                            if (!(node.params && node.params.length)) {
                               methodStart.push("void");
                            } else {
                                node.params.forEach(function (param) {
                                    methodStart.push(param.name);
                                })
                            }
                            methodStart.push(') {');
                            appendLine(methodStart.join(" "));
                            changeIndention(1);
                            return;


                        case Syntax.ReturnStatement:
                            var hasArguments = node.argument;
                            appendLine("return " + (hasArguments ? handleExpression(node.argument) : "") + ";");
                            return;

                        case Syntax.VariableDeclarator :
                            console.log("Meep!");
                            var line = toGLSLType(node.extra) + " " + node.id.name;
                            if(node.init) line += " = " + handleExpression(node.init);
                            appendLine(line + ";");
                            return;

                        case Syntax.AssignmentExpression:
                            appendLine(handleExpression(node) + ";")
                            return;

                        case Syntax.ExpressionStatement:
                            appendLine(handleExpression(node.expression) + ";");
                            return VisitorOption.Skip;


                        default:
                            console.log("Unhandled: " + type);

                    }
                },
                leave: function (node) {
                    var type = node.type;
                    switch (type) {
                        case Syntax.Program:
                            break;
                        case Syntax.FunctionDeclaration:
                            changeIndention(-1);
                            appendLine("}");
                            break
                    }
                }
            }
        );
        return lines.join("\n");
    }

    /**
     *
     * @param node
     * @returns {string}
     */
    var handleExpression = function(node) {
        var result = "<unhandled>";
        switch(node.type) {
            case Syntax.NewExpression:
                result = toGLSLType(node.extra);
                result += handleArguments(node.arguments);
                break;

            case Syntax.Literal:
                result = node.extra.staticValue !== undefined ? node.extra.staticValue : node.value;
                break;


            case Syntax.Identifier:
                result = node.name;
                break;

            case Syntax.BinaryExpression:
            case Syntax.AssignmentExpression:
                result = handleExpression(node.left);
                result += " " + node.operator + " ";
                result += handleExpression(node.right);
                break;

            case Syntax.CallExpression:
                result = handleExpression(node.callee);
                result += handleArguments(node.arguments);
                break;

            case Syntax.MemberExpression:
                result = handleExpression(node.object);
                result += ".";
                result += handleExpression(node.property);
                break;
            default:
                //console.log("Unhandled: " , node.type);
        }
        return result;
    }

    function handleArguments(container) {
        var result = "(";
        container.forEach(function (arg, index) {
            result += handleExpression(arg);
            if (index < container.length - 1) {
                result += ", ";
            }
        });
        return result + ")";
    }


    exports.generate = generate;


}(exports));
