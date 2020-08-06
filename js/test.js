/**
 * User: BarbedCoil
 * Date: 11/3/14
 * Time: 10:59 AM
 */
var DentalModule = function () {
	// Flag indicating the census window should be closed after saving.
	var closeCensus = false;

	// Used for the "add one row at a time" functionality.
	var _rowsToAdd;
	var _rowCount;
	var _currentRow;
	var _itemSelected_Count = 0;
	var _rowIndex;

	var _isCopy;
	var _isMerge;
	var _sourceSystem;

	init = function () {
		//querystring params
		_isCopy = queryString("iscopy") == "T" ? true : false;
		//merge is not a thing in Dental
		//_isMerge = queryString("CensusId2").length > 0 ? true : false;
		_sourceSystem = queryString("SourceSystem");

		getStates();
		bindUIEvents();
		koBindingHandlers();
		populateCensus();
		// initial table striping
		colorizeCensus();
		initPlaceholder();
	},

		getStates = function () {
			$.ajax({
				type: "GET",
				async: false,
				url: "../api/Lookup/GetStates",
				dataType: "json",
				success: function (data) {
					if (data != null) {
						viewModel.StateList = data;
					}
				},
				error: function (xhr) {
					toastr.error("Error binding state dropdowns.");
				}
			});
		},

		bindUIEvents = function () {

			$('body').on('click', 'input.navCount:text', function () {
				this.select();
			});

			$('#tblCensus').on('change', 'input.chkItemSelected', function () {
				if (this.checked) {
					_itemSelected_Count++;
				} else {
					_itemSelected_Count--;
				}
			});

			$(window).bind('beforeunload', function () {
				if (!data.ReferencedByQuote && !data.CensusPushedToBW) { //&& !_isRO) {
					// Notify the user that changes may be lost if they didn't click "Save & Close"
					if (!closeCensus) {
						return "Any unsaved changes will be lost. Are you sure?";
					}
				}
			});

			//validate numeric value for count field
		},

		koBindingHandlers = function () {
			ko.bindingHandlers.setIndex = {
				init: function (element, valueAccessor, allBindings, data, context) {
					var prop = valueAccessor();
					element.setAttribute(prop, context.$index());
				}
			};

			ko.bindingHandlers.returnKey = {
				init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
					ko.utils.registerEventHandler(element, 'keydown', function (evt) {
						if (evt.keyCode === 13) {
							evt.preventDefault();
							valueAccessor().call(viewModel);
						}
					});
				}
			};
		},

		populateCensus = function () {
			viewModel.populateModel(data);

			ko.applyBindings(viewModel);

			viewModel.applyTabIndex();

			var beginAutoSave = false;
			(function autoSave() {
				if (!data.ReferencedByQuote && !data.CensusPushedToBW) {
					if (beginAutoSave) {
						viewModel.saveCensusInBackground();
						setTimeout(autoSave, autoSaveTimer);
					} else {
						beginAutoSave = true;
						setTimeout(autoSave, autoSaveTimer);
					}
				}
			})();
		},

		colorizeCensus = function () {
			// stripe
			//var trRows = $("#tblCensus > tbody > tr:nth-child(odd)");
			var trRows = $("#tblCensus > tbody > tr:odd");
			//console.log('trRows: ', trRows, ' count: ', trRows.length);
			if (_sourceSystem == "Portal") {
				//console.log('sourceSystem: Portal');
				trRows.addClass("table-stripe-odd");
			}
			else {
				//console.log('sourceSystem: CRM');
				trRows.removeClass("table-stripe-odd");
			}
		},

		initPlaceholder = function () {
			// get query string and ensure we do placeholder swap only for CRM, Portal has none
			var ss = purl().param('SourceSystem');
			if (ss.toUpperCase() == "CRM".toUpperCase()) {
				$("body").on('focusin', 'input[type=text], textarea', function () {
					$(this).attr('placeholder', '');
				});
				$("body").on('focusout', 'input[type=text], textarea', function () {
					$(this).attr('placeholder', '--');
				});

				//console.log("CRM: Initialize Placeholder swap");
				//$('input[type=text]').focusin(function () {
				//    $(this).attr('placeholder', '');
				//});
				//$('input[type=text]').focusout(function () {
				//    $(this).attr('placeholder', '--');
				//});

				//$('textarea').focusin(function () {
				//    $(this).attr('placeholder', '');
				//});
				//$('textarea').focusout(function () {
				//    $(this).attr('placeholder', '--');
				//});
			}
			// set focus now so above code works
			$('#txtCensusName').focus();
		},


		// Client-side ViewModel
		viewModel = {
			C_CENSUS_HEADERID: ko.observable(""),
			CENSUS_NAME: ko.observable(""),
			CENSUS_NOTES: ko.observable(""),
			Number: ko.observable(""),
			Type: ko.observable(""),

			hasError: ko.observable(),
			validationMessage: ko.observable(),


			//state list for dropdowns
			StateList: ko.observableArray([]),

			States: ko.observableArray([{
				StateCounty: ko.observable(""),
				Count: ko.observable(""),
				ISITEMSELECTED: ko.observable(false)
			}]),

			States_Copy: ko.observableArray([{
				StateCounty: ko.observable(),
				Count: ko.observable(),
				ISITEMSELECTED: ko.observable()
			}]),

			isAllRowsSelected: ko.observable(false),

			selectAllRows: function () {
				var underlyingArray = viewModel.States();

				for (var i = 0; i < underlyingArray.length; i++) {
					underlyingArray[i].ISITEMSELECTED(viewModel.isAllRowsSelected());
				}

				viewModel.States.valueHasMutated();

				if (viewModel.isAllRowsSelected()) {
					_itemSelected_Count = underlyingArray.length;
				} else {
					_itemSelected_Count = 0;
				}

				return true;
			},

			addCensus_v3: function () {
				_rowsToAdd = $('#txtRows').val();
				_rowCount = $('#memberItems tr:last').index() + 1;
				_currentRow = 0;

				//if (_rowsToAdd && (Number(_rowsToAdd) + Number(_rowCount)) <= 500) {
				document.getElementById("message").style.display = "none";

				var bStopSpin = true;
				var underlyingArray = viewModel.States();
				//var lifeClass = viewModel.isLifeClassEnabled() ? "1" : ""; //only default to 1 if the LifeClass box is checked

				for (var x = 0; x < _rowsToAdd; x++) {
					var self = this, addCensus_SingleRow = function () {
						var underlyingArray = viewModel.States();
						underlyingArray.push({
							StateCounty: ko.observable(""),
							Count: ko.observable(""),
							ISITEMSELECTED: ko.observable(false)
						});

						_currentRow++;

						if (_currentRow == _rowsToAdd) {

							viewModel.States.valueHasMutated();

							var rows = $(".memberItems").find("TR");
							_rowIndex = 10;

							var tableRows = rows, rows_applyTabIndex = function () {
								for (var x = 0; x < tableRows.length; x++) {
									$(tableRows[x]).find('.navState')[0].tabIndex = _rowIndex++;
									//$(tableRows[x]).find('input.navState').data("kendoDropDownList").attr("tabIndex", _rowIndex++);
									$(tableRows[x]).find('input.navCount')[0].tabIndex = _rowIndex++;
								}
							};

							$.queue_census.add(rows_applyTabIndex, this);

							document.getElementById("message").style.display = "none";
							$('#txtRows').val("");

							var stateFields = $("#memberItems").find("input.navState");
							for (var i = 0; i < stateFields.length; i++) {
								if (stateFields[i].value == "") {
									$(stateFields[i]).data("kendoDropDownList").focus();
									break;
								}
							}
						}
					};

					$.queue_census.add(addCensus_SingleRow, this);
				}
				//} else {
				//    toastr.info('A maximum of 500 members is allowed.\nYou may add only ' + (500 - _rowCount) + ' more members to the census.');

				//    document.getElementById("message").style.display = "none";
				//}
				//colorizeCensus();
			},

			removeButton_OnClick: function () {
				viewModel.removeSelected(true);
			},

			removeSelected: function (confirmMsg) {
				if (_itemSelected_Count == 0 && confirmMsg) {
					alert("No states have been selected to delete.");
				} else {
					if (confirmMsg) {
						var confirmDelete = confirm("Are you sure you want to delete selected states?");
						if (!confirmDelete) {
							return;
						}
					}

					this.States.remove(function (item) { return item.ISITEMSELECTED() == true });

					var tableRows = $(".memberItems").find('tr');

					if (tableRows.length == 0) {
						viewModel.States.push({
							StateCounty: ko.observable(""),
							Count: ko.observable(""),
							ISITEMSELECTED: ko.observable(false)
						});
					} else {
						//Reassign the arrayIndex values.
						for (var x = 0; x < tableRows.length; x++) {
							rowInputs = $(tableRows[x]).find('input:text');
							rowInputs.attr("arrayIndex", x);
						}
					}

					$("#chkSelect")[0].checked = "";
					_itemSelected_Count = 0;
				}
			},

			itemNumber: function (index) {
				return index + 1;
			},

			cloneStatesArray: function () {
				viewModel.States_Copy(viewModel.States.slice(0));
				viewModel.States_Copy.remove(function (item) {
					return item.StateCounty().replace(/\s/g, "") == "" &&
						item.Count().replace(/\s/g, "") == ""
				});
			},

			saveCensusClose: function () {
				closeCensus = true;
				this.saveCensus_init();
			},


			saveCensus_init: function () {
				document.getElementById("saveImage").style.display = "";
				setTimeout(this.saveCensus, 100);
			},

			saveCensus: function () {
				var errorMessage = viewModel.saveValidation(false);
				var ajaXUrl = "";

				//if (viewModel.C_CENSUS_HEADERID.length == 0 || _isCopy || _isMerge) {
				if (viewModel.C_CENSUS_HEADERID.length == 0 || _isCopy) {
					ajaxUrl = $("#WebRoot").val() + "census/create"
				} else {
					ajaxUrl = $("#WebRoot").val() + "census/update"
				}

				if (errorMessage == "") {
					// Grab a copy of the DETAIL array without the blank rows.
					viewModel.cloneStatesArray();

					var viewModel_Copy = new Object();
					viewModel_Copy.C_CENSUS_HEADERID = viewModel.C_CENSUS_HEADERID;
					viewModel_Copy.CENSUS_NAME = viewModel.CENSUS_NAME();
					viewModel_Copy.CENSUS_NOTES = viewModel.CENSUS_NOTES();
					viewModel_Copy.Type = viewModel.Type();
					//viewModel_Copy.DETAIL = viewModel.DETAIL_Copy();
					viewModel_Copy.States = viewModel.States_Copy();

					$.ajax({
						url: ajaxUrl,
						type: 'POST',
						data: ko.mapping.toJSON(viewModel_Copy), // Convert the Knockout observables back to server ViewModel Json string
						contentType: 'application/json;charset=utf-8',
						success: function (data) {
							if (data.indexOf("Error:") > -1) {
								document.getElementById("saveImage").style.display = "none";

								toastr.info(data.substring(data.indexOf(":") + 1));
							} else {
								if (closeCensus) {
									document.getElementById("saveImage").style.display = "none";
									window.close();
								} else {
									$('#txtCCensusHeaderId').val(data);
									viewModel.C_CENSUS_HEADERID = data;

									document.getElementById("saveImage").style.display = "none";
									_isCopy = false;
									//_isMerge = false;

									toastr.success("This census has been saved. ");
								}
							}
						},
						error: function (data) {
							document.getElementById("saveImage").style.display = "none";

							toastr.error('Problem posting the census:' + data.responseText);
						}
					});
				}
				else {
					document.getElementById("saveImage").style.display = "none";

					toastr.error(errorMessage);
				}
			},

			saveCensusInBackground: function () {
				var errorMessage = viewModel.saveValidation(false);
				var ajaXUrl = "";

				if (viewModel.C_CENSUS_HEADERID.length == 0) {
					ajaxUrl = $("#WebRoot").val() + "census/create"
				} else {
					ajaxUrl = $("#WebRoot").val() + "census/update"
				}

				if (errorMessage == "") {
					// Grab a copy of the DETAIL array without the blank rows.
					viewModel.cloneStatesArray();

					var viewModel_Copy = new Object();
					viewModel_Copy.C_CENSUS_HEADERID = viewModel.C_CENSUS_HEADERID;
					viewModel_Copy.CENSUS_NAME = viewModel.CENSUS_NAME();
					viewModel_Copy.CENSUS_NOTES = viewModel.CENSUS_NOTES();
					viewModel_Copy.Type = viewModel.Type();
					//viewModel_Copy.DETAIL = viewModel.DETAIL_Copy();
					viewModel_Copy.States = viewModel.States_Copy();

					$.ajax({
						url: ajaxUrl,
						type: 'POST',
						data: ko.mapping.toJSON(viewModel_Copy), // Convert the Knockout observables back to server ViewModel Json string
						contentType: 'application/json;charset=utf-8',
						success: function (data) {
							if (data.indexOf("Error:") > -1) {
								document.getElementById("saveImage").style.display = "none";

								toastr.info(data.substring(data.indexOf(":") + 1));
							} else {
								if (closeCensus) {
									document.getElementById("saveImage").style.display = "none";
									window.close();
								} else {
									$('#txtCCensusHeaderId').val(data);
									viewModel.C_CENSUS_HEADERID = data;

									toastr.success("This census has been saved. ");
								}
							}
						},
						error: function (data) {
							toastr.error('Problem posting the census:' + data.responseText);
						}
					});
				}
				else {
					toastr.error(errorMessage);
				}
			},

			saveValidation: function (deleteBlanks) {
				var memberCensusName = "";
				var errorMessage = "";
				var rows = new Array();
				var state = "";
				var count = "";

				var objCensusName = $('#txtCensusName').val();
				if (objCensusName == "") {
					memberCensusName = "Census Name is required.";
				}

				rows = document.getElementById("memberItems").getElementsByTagName("TR");

				var blankCount = 0;
				var underlyingArray = viewModel.States();
				var firstErrorField = null;

				// next we can loop through this array and get all cells
				for (var iRowCount = 0; iRowCount < rows.length; iRowCount++) {
					var fields = $(rows[iRowCount]).find('input:text:not(:disabled)');
					var fieldsEmpty = true;

					// Uncheck every row, in case the user left rows checked that they want to save.
					// We only want to check blank rows, so that we can delete them when we save the census.
					underlyingArray[fields[0].attributes.arrayIndex.value].ISITEMSELECTED(false);

					for (var i = 0; i < fields.length; i++) {
						if (fields[i].value.replace(/\s/g, "") != "") {
							fieldsEmpty = false;
							break;
						}
					}

					if (fieldsEmpty && deleteBlanks) {
						underlyingArray[fields[0].attributes.arrayIndex.value].ISITEMSELECTED(true);
						blankCount++;
					} else if (fieldsEmpty) {
						blankCount++;
					} else {
						if (viewModel.validateState(rows[iRowCount].getElementsByTagName("TD")[1]) == 1) {
							state = "Please select a State.";

							if (firstErrorField == null) {
								firstErrorField = $(rows[iRowCount]).find("input.navState");
							}
						}
						if (viewModel.validateCount(rows[iRowCount].getElementsByTagName("TD")[2]) == 2) {
							count = "Entry of the Home Count is required.";

							if (firstErrorField == null) {
								firstErrorField = $(rows[iRowCount]).find("input.navCount");
							}
						} else if (viewModel.validateCount(rows[iRowCount].getElementsByTagName("TD")[2]) == 1) {
							count = "Invalid Home Count value.";

							if (firstErrorField == null) {
								firstErrorField = $(rows[iRowCount]).find("input.navCount");
							}
						}
					}
				}
				if (memberCensusName != "") {
					errorMessage = errorMessage + memberCensusName + "<br />";
				}
				if (blankCount == rows.length) {
					errorMessage = errorMessage + "At least one completed census row is required.<br />"
				}
				if (state != "") {
					errorMessage = errorMessage + state + "<br />";
				}
				if (count != "") {
					errorMessage = errorMessage + count + "<br />";
				}

				viewModel.States.valueHasMutated();
				viewModel.removeSelected(false);

				if (firstErrorField != null) {
					if (!$(firstErrorField).hasClass("navState")) {
						firstErrorField.eq(0).select();
					} else {
						$(firstErrorField).data("kendoDropDownList").focus();
					}
				}

				return errorMessage;
			},

			validateState: function (currentValue) {

				$(currentValue).find(".k-dropdown-wrap").css('border-color', 'black');

				if ($(currentValue).find("input.navState")[0].value == "") {
					$(currentValue).find(".k-dropdown-wrap").css('border-color', 'red');
					return 1;
				}

				return 0;
			},

			validateCount: function (currentValue) {

				currentValue.children[0].style.borderColor = "Black";
				var isErrored = 0;

				if (currentValue.children[0].value != "") {
					var regx = /^\d+$/;

					if (!regx.test(currentValue.children[0].value)) {
						isErrored = 1;
						currentValue.children[0].style.borderColor = "Red";
					}
				} else {
					isErrored = 2;
					currentValue.children[0].style.borderColor = "Red";
				}

				return isErrored;
			},

			populateModel: function (data) {
				if (data != null) {
					this.Type(data.Type);

					if (data.C_CENSUS_HEADERID != null) {
						this.C_CENSUS_HEADERID = data.C_CENSUS_HEADERID;
						this.CENSUS_NAME(data.CENSUS_NAME);
						this.CENSUS_NOTES(data.CENSUS_NOTES);
						this.Number(data.Number);
						//this.isIncludeLife(data.IncludesLife);

						this.States.removeAll();

						var underlyingArray = this.States();

						document.getElementById("saveImage").style.display = "";

						//var noLifeClassEntries = true;

						for (var x = 0; x < data.States.length; x++) {

							underlyingArray.push({
								StateCounty: ko.observable(data.States[x].StateCounty),
								Count: ko.observable(data.States[x].Count),
								ISITEMSELECTED: ko.observable(false)
							});
						}

						this.States.valueHasMutated();

						document.getElementById("saveImage").style.display = "none";
					}
				}
			},

			applyTabIndex: function () {
				var rows = $(".memberItems").find("TR");
				var index = 10;

				for (var x = 0; x < rows.length; x++) {
					$(rows[x]).find('.navState')[0].tabIndex = index++;
					//$(rows[x]).find('input.navState').data("kendoDropDownList").attr("tabIndex", index++);
					$(rows[x]).find('input.navCount')[0].tabIndex = index++;
				}
			}
		};
		//End Client-side ViewModel

		$.queue_census = {
			_timer: null,
			_queue: [],
			add: function (fn, context, time) {
				var setTimer = function (time) {
					$.queue_census._timer = setTimeout(function () {
						time = $.queue_census.add();
						if ($.queue_census._queue.length) {
							setTimer(time);
						}
					}, time || 2);
				};

				if (fn) {
					$.queue_census._queue.push([fn, context, time]);
					colorizeCensus();
					if ($.queue_census._queue.length == 1) {
						setTimer(time);
					}
					return;
				};

				var next = $.queue_census._queue.shift();
				if (!next) {
					return 0;
				}
				next[0].call(next[1] || window);
				return next[2];
			},
			clear: function () {
				clearTimeout($.queue_census._timer);
				$.queue_census._queue = [];
			}
		};

	return {
		init: init,
		viewModel: viewModel
	}

}();

$(function () {
	DentalModule.init();
});