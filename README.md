jModUploader
============

About
---------------

jQuery plug-in as a frontend of[mod_uploader](http://en.sourceforge.jp/projects/mod-uploader/).

Usage
---------------

`<form id="jModUploaderForm" ...>
	<input type="file">
	<input type="submit">
</form>`

`/**
 * jModUploader
 */
$('#jModUploaderForm').jModUploader({
	// mod_uploader's endpoint URL
	url:            'http://hostname/path/to/mod_uploader',
	// status poling interval (mili sec)
	updateInterval: 250,
	// beforeUpload Handler
	beforeUpload:   function() {
		doSomething();
	},
	// progress handler
	progress:       function() {
		doSomething();
	},
	// success handler
	success:        function(data) {
		doSomething();
	},
	// error handler
	error:          function(data) {
		doSomething();
	}
});`

