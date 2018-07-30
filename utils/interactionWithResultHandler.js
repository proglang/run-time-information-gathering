/* global module */
/* global require */

"use strict";

(function(exp) {
	var getTypeOf = require("./getTypeOf.js").getTypeOf;

	function InteractionWithResultHandler(
		interactionFinder,
		recursiveInteractionsHandler,
		sMemoryInterface,
		argumentContainerFinder
	) {

		this.interactionFinder = interactionFinder;
		this.recursiveInteractionsHandler = recursiveInteractionsHandler;
		this.sMemoryInterface = sMemoryInterface;
		this.argumentContainerFinder = argumentContainerFinder;

		var dis = this;

		this.processResultOfInteraction = function(interaction, functionId, result, base) {
			if (getTypeOf(result) == "object") {
				dis.interactionFinder.addMapping(interaction, functionId, result);
				dis.recursiveInteractionsHandler.associateMainInteractionToCurrentInteraction(
					interaction,
					result
				);
			}

			if (!addInteractionToArgumentContainerIfPossible(interaction, functionId, base)) {
				addFollowingInteraction(
					interaction,
					result,
					functionId,
					dis.sMemoryInterface.getShadowIdOfObject(base)
				);
			}
		};

		function addInteractionToArgumentContainerIfPossible(interaction, functionId, base) {
			var shadowId = dis.sMemoryInterface.getShadowIdOfObject(base);

			var argumentContainer = dis.argumentContainerFinder.findArgumentContainer(shadowId, functionId);

			var interactionAdded = false;
			if (functionId && argumentContainer) {
				argumentContainer.addInteraction(interaction);
				interactionAdded = true;
			}

			return interactionAdded;
		}

		function addFollowingInteraction(interaction, result, functionId, shadowIdBaseObject) {
			var mappedInteraction = dis.interactionFinder.findInteraction(
				shadowIdBaseObject,
				functionId
			);

			if (mappedInteraction) {
				if (!dis.recursiveInteractionsHandler.interactionAlreadyUsed(interaction, result)) {
					mappedInteraction = dis.recursiveInteractionsHandler.getMainInteractionForCurrentInteraction(mappedInteraction);
					mappedInteraction.addFollowingInteraction(interaction);

					dis.recursiveInteractionsHandler.reportUsedInteraction(interaction, result);
				}
			}
		}
	}

	exp.InteractionWithResultHandler = InteractionWithResultHandler;

})(module.exports);