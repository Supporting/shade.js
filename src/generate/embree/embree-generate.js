(function (ns) {

    var Base = require("./../../base/index.js");
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
            return [];
        var header = [
            "// Generated by shade.js",
            "#ifndef __EMBREE_SHADEJS_MATERIAL_H__",
            "#define __EMBREE_SHADEJS_MATERIAL_H__",

            "#include \"../materials/material.h\"",
            "#include \"../brdfs/lambertian.h\"",
            "#include \"../textures/texture.h\"",
            "",
            "namespace embree",
            "{"
        ];
        return header;
    }

    var getEpilog = function(opt) {
        var epilog = [
            "}",
            "#endif"
        ];
        return epilog;
    }

    var toEmbreeType = function (info) {
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
                        return "<undefined>";
                }
            case Types.UNDEFINED:
                return "void";
            case Types.NUMBER:
                return "float";
            case Types.INT:
                return "int";
            default:
                throw new Error("toEmbreeType: Unhandled type: " + info.type);

        }
    }

    function createLineStack() {
        var arr = [];
        arr.push.apply(arr, arguments);
        var indent = "";
        arr.appendLine = function(line){
            this.push(indent + line);
        };
        arr.changeIndention = function(add){
            while(add > 0){
                indent += "    "; add--;
            }
            if(add < 0){
                indent = indent.substr(0, indent.length + add*4);
            }
        };
        arr.append = function(str){
            this[this.length-1] = this[this.length-1] + str;
        };
        return arr;
    };


    /*Base.extend(LineStack.prototype, {

    });*/

    var generate = function (ast, opt) {

        opt = opt || {};

        var indent = "";
        var lines = createLineStack();

        traverse(ast, lines, opt);

        return lines.join("\n");
    }

    function traverse(ast, lines, opt) {
        walk.traverse(ast, {
                enter: function (node) {
                    var type = node.type;
                    switch (type) {


                        case Syntax.Program:
                            getHeader(opt).forEach(function(e) { lines.push(e) });
                            break;


                        case Syntax.FunctionDeclaration:
                            var func = new FunctionAnnotation(node);
                            var methodStart = [toEmbreeType(func.getReturnInfo())];
                            methodStart.push(node.id.name, '(');
                            if (!(node.params && node.params.length)) {
                                methodStart.push("void");
                            } else {
                                node.params.forEach(function (param) {
                                    methodStart.push(param.name);
                                })
                            }
                            methodStart.push(') {');
                            lines.appendLine(methodStart.join(" "));
                            lines.changeIndention(1);
                            return;


                        case Syntax.ReturnStatement:
                            var hasArguments = node.argument;
                            lines.appendLine("return " + (hasArguments ? handleExpression(node.argument) : "") + ";");
                            return;

                        case Syntax.VariableDeclarator :
                            // console.log("Meep!");
                            var line = toEmbreeType(node.extra) + " " + node.id.name;
                            if(node.init) line += " = " + handleExpression(node.init);
                            lines.appendLine(line + ";");
                            return;

                        case Syntax.AssignmentExpression:
                            lines.appendLine(handleExpression(node) + ";")
                            return;

                        case Syntax.ExpressionStatement:
                            lines.appendLine(handleExpression(node.expression) + ";");
                            return VisitorOption.Skip;

                        case Syntax.IfStatement:
                            lines.appendLine("if (" + handleExpression(node.test) + ") {");

                            lines.changeIndention(1);
                            traverse(node.consequent, lines, opt);
                            lines.changeIndention(-1);

                            if (node.alternate) {
                                lines.appendLine("} else {");
                                lines.changeIndention(1);
                                traverse(node.alternate, lines, opt);
                                lines.changeIndention(-1);
                            }
                            lines.appendLine("}");
                            return VisitorOption.Skip;


                        default:
                        //console.log("Unhandled: " + type);

                    }
                },
                leave: function (node) {
                    var type = node.type;
                    switch (type) {
                        case Syntax.Program:
                            getEpilog(opt).forEach(function(e) { lines.push(e) });
                            break;
                        case Syntax.FunctionDeclaration:
                            lines.changeIndention(-1);
                            lines.appendLine("}");
                            break;
                    }
                }
            }
        );
    }

    var generateFloat = function(value) {
        if(isNaN(value))
            throw Error("Internal: Expression generated NaN!");
        var result = '' + value;
        if (result.indexOf(".") == -1) {
            result += ".0";
        }
        return result;
    }

    /**
     *
     * @param node
     * @returns {string}
     */
    var handleExpression = function(node) {
        var result = "<unhandled: " + node.type+ ">";
        switch(node.type) {
            case Syntax.NewExpression:
                result = toEmbreeType(node.extra);
                result += handleArguments(node.arguments);
                break;

            case Syntax.Literal:
                var value = node.extra.staticValue !== undefined ? node.extra.staticValue : node.value;
                if (node.extra.type == Types.NUMBER)
                    result = generateFloat(value);
                else
                    result = value;
                break;


            case Syntax.Identifier:
                result = node.name;
                break;

            case Syntax.BinaryExpression:
            case Syntax.LogicalExpression:
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

            case Syntax.ConditionalExpression:
                result = handleExpression(node.test);
                result += " ? ";
                result += handleExpression(node.consequent);
                result += " : ";
                result += handleExpression(node.alternate);
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
