/**
 * jModUploader.js
 *
 * A jQuery plugin which integrated with mod_uploader 
 * 
 * @author       Toshiya TSURU <turutosiya@gmail.com>
 * @author       Qiang Lu <lvqiang@xuzhousoft.com>
 * @author       Li <liwenguang@xuzhousoft.com>
 * 
 */
(function($){
	/**
	 * trace
	 */
	var trace = function(msg) {
		try { console.log('[jModUploader.js] ' + msg); } catch(e) {}
	}; trace('trace() enabled');
	/**
	 * 
	 * @param stat
	 * @param totalSize
	 * @param readSize
	 * @param startTime
	 * @returns  object
	 */
	var Progress = function (status, total, uploaded, begin) {
		trace('Progress(\'' + status + '\', ' +  total + ', ' +  uploaded + ', ' + begin + ')');
		
		this.status      = status;
		this.total       = 'undefined' == typeof(total) ?             -1 : total;
		this.uploaded    = 'undefined' == typeof(uploaded) ?          -1 : uploaded;
		this.percentage  = (this.total <= 0 && this.uploaded < 0) ?   -1 : Math.round(this.uploaded * 100 * 10 / this.total) / 10;
		this.begin       = ('undefined' == typeof(begin)) ?           -1 : begin;
		this.elapsed     = (this.begin < 0) ?                         -1 : (new Date()).getTime() - this.begin;
		this.bps         = (this.uploaded < 0 || this.elapsed <= 0) ? -1 : (this.uploaded / (this.elapsed / 1000)) * 8 /* bytes to bits */;
		this.takes       = (this.bps < 0) ?                           -1 : (this.total - this.uploaded) / (this.bps / 8)  * 1000 /* sec to millisec */;
		this.errorMessage = $("iframe[name='backup-upload-frame']").contents().find('#error_message').html();
		
		if ( 'undefined' != typeof(this.errorMessage) )
			this.status = Progress.STATUS_ERROR;
			
		return this;
	};
	/**
	 * 
	 */
	Progress.STATUS_SUCCESS  = 'S';
	Progress.STATUS_PROGRESS = 's';
	// http://redmine.nadai.jp/issues/315
	Progress.STATUS_UNKNOWN  = 'u';
	Progress.STATUS_ERROR    = 'E';
	/**
	 * parse
	 */
	Progress.parse = function(response, begin) {
		trace('Progress#parse(\'' + response + '\')');
		// default data
		var _data  = ['E', -1, -1];
		// chech response
		if(response == 'u'
			 || (1 < response.length && response.charAt(1) == ' ')) {
			_data    = response.split(' ');
		}
		// create prgress object
		return new Progress(_data[0], _data[1], _data[2], begin);
	};
	/**
	 * extend $(jQuery or Zepto)
	 * 
	 * @see http://docs.jquery.com/Core/jQuery.fn.extend
	 */
	/**
	 * 
	 */
	var DEFAULT_URL            = 'uploader/';
	/**
	 * 
	 */
	var DEFAULT_UPDATE_INTEVAL = 400;
	$.fn.extend({
		/**
		 * jModUploader
		 * @api
		 */
		jModUploader: function(config) {
			trace('uploader()');	
			// keep this
			var _$this = this;
			// initialize
			_$this._initialize(config);
			// return
			return _$this;
		},
		/**
		 * _initialize
		 */
		_initialize: function(config) {
			trace('_initialize()');
			// keep this
			var _$this   = this;
			// process
			_$this
				._loadConfig(config)
				._detectUploadId()
				._hookSubmit();
			// return
			return _$this;
		},
		/**
		 * _loadConfig
		 */
		_loadConfig: function(config) {
			trace('_loadConfig()');
			// keep this
			var _$this   = this;
			// check config
			if(!config)                { config                = {}; }
			if(!config.url)            { config.url            = DEFAULT_URL; }
			if(!config.updateInterval) { config.updateInterval = DEFAULT_UPDATE_INTEVAL; }
			// 
			_$this.url            = config.url;
			// 
			_$this.updateInterval = config.updateInterval;
			// 
			if('function'         == typeof config.beforeUpload) {
				_$this.beforeUpload = config.beforeUpload;
			}
			// 
			if('function'         == typeof config.progress) {
				_$this.progress     = config.progress;
			}
			// 
			if('function'         == typeof config.success) {
				_$this.success      = config.success;
			}
			// 
			if('function'         == typeof config.error) {
				_$this.error        = config.error;
			}
			// return
			return _$this;
		},
		/**
		 * _detectUploadId
		 */
		_detectUploadId: function() {
			trace('_detectUploadId()');
			// keep this
			var _$this            = this;
			// random upload_id
			_$this.uploadId       = Math.floor(Math.random() * (Math.pow(2, 32) - 1)) + 1;
			// return
			return _$this;
		},
		/**
		 * _create target iframe
		 */
		_createTargetIframe: function() {
			trace('_createTargetIframe()');
			// keep this
			var _$this   = this;
			// create iframe
			var _$iframe = $('<iframe>')
				.attr('id', 'JMODUPLOADER_TARGET_IFRAME_' + _$this.uploadId)
				.attr('name', 'backup-upload-frame')
				.attr('data-upload-id', _$this.uploadId)
				.appendTo('body')
				.hide()
				.load(function(evt){
					_$this.isIframeLoaded = true;
				});
			// set property
			_$this.iframe = _$iframe;
			// return
			return _$this;
		},
		/**
		 * _prepareThisForm
		 */
		_prepareThisForm: function(config) {
			trace('_prepareThisForm()');
			// keep this
			var _$this   = this;
			// force "enctype" attribute to 'multipart/form-data'
			_$this.attr('enctype', 'multipart/form-data');
			_$this.attr('action',  _$this._buildUrl('upload'));
			_$this.attr('target',  _$this.iframe.attr('name'));
			// return
			return _$this;
		},
		/**
		 * _hookSubmit
		 */
		_hookSubmit: function() {
			trace('_hookSubmit()');
			// keep this
			var _$this   = this;
			// set submit handler
			_$this.submit(function(evt){
				_$this._onBeforeSubmit();
			});
			// return
			return _$this;
		},
		/**
		 * 
		 */
		_buildUrl: function(command) {
			trace('_buildUrl(\'' + command + '\')');
			// keep this
			var _$this   = this;
			//
			var _url = _$this.url;
			// switch by commadn
			switch(command) {
				case 'upload':   _url = _url + '/upload/'        + _$this.uploadId; break;
				case 'progress': _url = _url + '/progress_data/' + _$this.uploadId; break;
			}
			trace('_buildUrl(\'' + command + '\') returns "' + _url + '"');
			// return
			return _url;
		},
		/**
		 * _onBeforeSubmit
		 */
		_onBeforeSubmit: function() {
			trace('_onBeforeSubmit()');
			// keep this
			var _$this   = this;
			
			if ( 1 == $("iframe[name='backup-upload-frame']").length )
				$("iframe[name='backup-upload-frame']").remove();
				
			_$this._createTargetIframe();
			_$this._prepareThisForm();
				
			// keep begin time
			_$this.begin          = (new Date()).getTime();
			// set loadede flag FALSE
			_$this.isIframeLoaded = false;
			// get uploading filename
			var _fileName = $('input[type="file"]', _$this).val();
			_fileName     = (_fileName) ? _fileName.substr(_fileName.lastIndexOf('\\')+1) : null;
			if (_fileName != null) {
				// call handler
				if('function' == typeof _$this.beforeUpload) {
					// call event
					_$this.beforeUpload({
						"fileName": _fileName
					});
				}
				// _pollProgress
				setTimeout(function() {
					// execute polling
					_$this._pollProgress();
				}, _$this.updateInterval);
			}
			// return
			return _$this;
		},
		/**
		 * _pollProgress
		 */
		_pollProgress: function() {
			trace('_pollProgress()');
			// keep this
			var _$this   = this;
			// call mod_uploeader's progress_data command
			$.ajax({
				url:      _$this._buildUrl('progress'),
				type:     "post",
				success:  function(data){ 
					_$this._onProgress(Progress.parse(data, _$this.begin));
				},
				error:    function(jqXHR, textStatus, errorThrown){ 
					_$this._onError();
				},
				dataType: 'text'
			});
			// return
			return _$this;
		},
		/**
		 * _onProgress
		 */
		_onProgress: function(progress) {
			trace('_onProgress()');
			// keep this
			var _$this          = this;
			// update progress property
			_$this.progressData = progress;
			//  switch by the case
			switch(_$this._getProgressStatus()) {
				case Progress.STATUS_SUCCESS:
					// call _onAfterSubmit
					_$this._onAfterSubmit();
					break;
				// case Progress.STATUS_UNKNOWN: // keep trying polling when STATUS_UNKNOWN('u') @see http://redmine.nadai.jp/issues/315
				case Progress.STATUS_ERROR:
					_$this._onAfterSubmit();
					break;
				default:
					// call handler
					if('function' == typeof _$this.progress) {
						_$this.progress(progress);
					}
					// settimeout next polling
					setTimeout(function(){ _$this._pollProgress(); }, _$this.updateInterval);
					break;
			}
			// return
			return _$this;
		},
		/**
		 * _getProgressStatus
		 */
		_getProgressStatus: function() {
			trace('_getProgressStatus()');
			
			return ('undefined' == typeof this.progressData) ? '' : this.progressData.status;
		},
		/**
		 * _onAfterSubmit
		 */
		_onAfterSubmit: function() {
			trace('_onAfterSubmit()');
			
			// keep this
			var _$this   = this;
			// switch by the case
			switch(_$this._getProgressStatus()) {
				case Progress.STATUS_SUCCESS: 
					_$this._onSuccess();
					break;
				case Progress.STATUS_UNKNOWN:
				case Progress.STATUS_ERROR:
					_$this._onError(); 
					break;
			}
			return _$this;
		},
		/**
		 * _onSuccess
		 */
		_onSuccess: function() {
			trace('_onSuccess()');
			
			// keep this
			var _$this           = this;
			var _finish          = (new Date()).getTime();
			// call handler
			if('function' == typeof _$this.success) {
				var _downloadUrl   = false;
				(function(){
					var _callee      = arguments.callee;
					// get download url from hidden iframe
					_downloadUrl     = _$this._getDownloadUrl();
					if (_downloadUrl == false) {
						// if we can not get the url, retry
						window.setTimeout(_callee, _$this.updateInterval);
					} else {
						// callback
						_$this.success({
							uploadId:    _$this.uploadId,
							begin:       _$this.begin,
							finish:      _finish,
							size : 		   _$this.progressData.total,
							downloadUrl: _downloadUrl,
							fileName:    _$this._extractFileNameFromUrl(_downloadUrl)
						});
					}
				})();
			}
			
			return _$this;
		},
		/**
		 * _getDownloadUrl
		 */
		_getDownloadUrl:      function(){
			trace('_getDownloadUrl()');
			
			var _downloadUrl;
			_downloadUrl        = $("iframe[name='backup-upload-frame']");
			_downloadUrl        = _downloadUrl.contents();
			_downloadUrl        = _downloadUrl.find('a[href*=download]');
			_downloadUrl        = _downloadUrl.attr('href');
			
			return ('undefined' == typeof(_downloadUrl)) ? false : _downloadUrl;
		},
		/**
		 * _extractFileNameFromUrl
		 * @returns
		 */
		_extractFileNameFromUrl: function(url){
			trace('_extractFileNameFromUrl("' + url + '")');
			var _a = document.createElement('a');
			_a.href = url;
			var _fileName = _a.pathname.split('/').pop();
			return _fileName;
		},
		/**
		 * _onError
		 */
		_onError: function() {
			trace('_onError()');
			// keep this
			var _$this    = this;
			// call handler
			if('function' == typeof _$this.error) {
				var message = (_$this.progressData.errorMessage) ? _$this.progressData.errorMessage.replace(/_/g, ' ').replace(/MESSAGE /g, '') : "";
				_$this.error({message:message});
			}
			// return 
			return _$this;
		}
  });
})(jQuery || Zepto);