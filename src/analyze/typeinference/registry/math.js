(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


    var evaluateMethod = function (name, paramCount, returnType) {
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        return function (result, args, ctx) {
            if (paramCount != -1) { // Arbitrary number of arguments
                if (!args || args.length != paramCount) {
                    throw new Error("Invalid number of parameters for Math." + name + ", expected " + paramCount);
                }
            }

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });
            var typeInfo = {
                type: returnType || TYPES.NUMBER
            }
            if (isStatic) {
                typeInfo.staticValue = Math[name].apply(undefined, argArray);
            }
            return typeInfo;
        }
    }

    var MathObject = {
        random: {
            type: TYPES.FUNCTION,
            evaluate: function(node, args) {
                if (args.length)
                    throw new Error("Math.random has no parameters.");
                return {
                    type: TYPES.NUMBER
                }
            }
        },
        abs: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Math.abs", [1], args.length);
                var typeInfo = {};
                switch(args[0].getType()) {
                    case TYPES.NUMBER:
                    case TYPES.INT:
                        typeInfo.type = args[0].getType();
                        break;
                    default:
                        Shade.throwError(result.node, "InvalidType for Math.abs");
                }
                return typeInfo;
            }
        }
    };

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];
    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan"];
    var OneParameterIntMethods = ["ceil", "floor"];
    var TwoParameterNumberMethods = ["atan2", "pow"];
    var ArbitraryParameterNumberMethods = ["max", "min"];

    MathConstants.forEach(function (constant) {
        MathObject[constant] = { type: TYPES.NUMBER, staticValue: Math[constant] };
    });

    OneParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 2) };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1, TYPES.INT) };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, -1) };
    });

    Base.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathObject
        },
        instance: MathObject
    });


}(exports));
