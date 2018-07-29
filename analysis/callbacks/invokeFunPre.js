/* global module */
/* global require */

"use strict";

(function(exp) {
	var FunctionContainer = require("../../utils/functionContainer.js").FunctionContainer;
	var getTypeOf = require("../../utils/getTypeOf.js").getTypeOf;
	var getDeclarationEnclosingFunctionId = require("../../utils/getDeclarationEnclosingFunctionId.js").getDeclarationEnclosingFunctionId;

	var UsedAsArgumentInteraction = require("../../utils/interactions/usedAsArgumentInteraction.js").UsedAsArgumentInteraction;

	function InvokeFunPre(
		runTimeInfo,
		functionsExecutionStack,
		mapMethodIdentifierInteractions,
		sMemoryInterface,
		argumentContainerFinder,
		argumentProxyBuilder,
		argumentWrapperObjectBuilder,
		mapWrapperObjectsOriginalValues
	) {

		var dis = this;

		this.runTimeInfo = runTimeInfo;
		this.functionsExecutionStack = functionsExecutionStack;
		this.mapMethodIdentifierInteractions = mapMethodIdentifierInteractions;
		this.sMemoryInterface = sMemoryInterface;
		this.argumentContainerFinder = argumentContainerFinder;
		this.argumentWrapperObjectBuilder = argumentWrapperObjectBuilder;
		this.argumentProxyBuilder = argumentProxyBuilder;

		this.mapWrapperObjectsOriginalValues = mapWrapperObjectsOriginalValues;

		this.runCallback = function(
			iid,
			f,
			base,
			args,
			isConstructor,
			isMethod,
			functionIid
		) {

			if (!isConsoleLog(f)) {
				addFunctionIidToMethodCallInteraction(f, functionIid);

				for (var argIndex in args) {
					addDeclarationEnclosingFunctionIdIfApplicable(args[argIndex]);
					addUsedAsArgumentInteractionIfApplicable(args[argIndex], functionIid, argIndex);
					convertToWrapperObjectIfItIsALiteral(args, argIndex);
					convertToProxyIfItIsAnObject(args, argIndex);
				}

				if (functionIid && !(functionIid in this.runTimeInfo)) {
					var functionContainer = new FunctionContainer(
						functionIid,
						getFunctionName(f)
					);

					functionContainer.iid = iid;
					functionContainer.isConstructor = isConstructor;
					functionContainer.isMethod = isMethod;
					functionContainer.declarationEnclosingFunctionId = f.declarationEnclosingFunctionId;

					this.runTimeInfo[functionIid] = functionContainer;
				}
			}

			return {
				f: f,
				base: base,
				args: args,
				skip: false
			};
		};

		function isConsoleLog(f) {
			return (f.name === "bound consoleCall");
		}

		function getFunctionName(f) {
			var functionName = f.name;

			if (f.methodName) {
				functionName = f.methodName;
			}

			return functionName;
		}

		function addFunctionIidToMethodCallInteraction(f, functionIid) {
			if (f.methodIdentifier in dis.mapMethodIdentifierInteractions) {
				var interaction = dis.mapMethodIdentifierInteractions[f.methodIdentifier];
				interaction.functionIid = functionIid;
			}
		}

		function addDeclarationEnclosingFunctionIdIfApplicable(val) {
			if (getTypeOf(val) == "function") {
				if (!val.declarationEnclosingFunctionId) {
					val.declarationEnclosingFunctionId = getDeclarationEnclosingFunctionId(dis.functionsExecutionStack);
				}
			}
		}

		function addUsedAsArgumentInteractionIfApplicable(val, functionIid, argIndex) {
			if (getTypeOf(val) == "object") {
				var currentActiveFiid = dis.functionsExecutionStack.getCurrentExecutingFunction();
				var shadowId = dis.sMemoryInterface.getShadowIdOfObject(val);

				var argumentContainer = dis.argumentContainerFinder.findArgumentContainer(shadowId, currentActiveFiid);
				if (currentActiveFiid && argumentContainer) {
					var usedAsArgumentInteraction = new UsedAsArgumentInteraction(
						currentActiveFiid,
						functionIid,
						argIndex
					);

					argumentContainer.addInteraction(usedAsArgumentInteraction);
				}
			}
		}

		function convertToWrapperObjectIfItIsALiteral(args, argIndex) {
			let originalArg = args[argIndex];
			let newArg;

			switch(getTypeOf(args[argIndex])) {
				case "string":
					newArg = dis.argumentWrapperObjectBuilder.buildFromString(originalArg);
					break;

				case "number":
					newArg = dis.argumentWrapperObjectBuilder.buildFromNumber(originalArg);
					break;
			}

			if (newArg) {
				args[argIndex] = newArg;

				let shadowIdProxy = dis.sMemoryInterface.getShadowIdOfObject(newArg);
				dis.mapWrapperObjectsOriginalValues[shadowIdProxy] = originalArg;
			}
		}

		function convertToProxyIfItIsAnObject(args, argIndex) {
			let arg = args[argIndex];

			if (getTypeOf(arg) == "object" && !(arg instanceof String) && !(arg instanceof Number)) {

				let proxy = dis.argumentProxyBuilder.buildProxy(arg);
				args[argIndex] = proxy;

				var shadowIdProxy = dis.sMemoryInterface.getShadowIdOfObject(proxy);
				dis.mapWrapperObjectsOriginalValues[shadowIdProxy] = arg;
			}
		}
	}

	exp.InvokeFunPre = InvokeFunPre;

})(module.exports);