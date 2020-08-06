// fix issue for multi line text box
String.prototype.escapeSpecialChars = function() {
	return this.replace(/%0A/g, "\\n")
		.replace(/\\'/g, "\\'")
		.replace(/\\"/g, '\\"')
		.replace(/\\&/g, "\\&")
		.replace(/%0D/g, "\\r")
		.replace(/\\t/g, "\\t")
		.replace(/\\b/g, "\\b")
		.replace(/\\f/g, "\\f");
};

// on ready init
$(document).ready(function() {

	$('#header_text').circleType({radius: 1200});
});

