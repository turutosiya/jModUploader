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
		return this;
	};
	/**
	 * 
	 */
	Progress.STATUS_SUCCESS  = 'S';
	Progress.STATUS_PROGRESS = 's';
	Progress.STATUS_FAILURE  = 'u';
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
	var DEFAULT_UPDATE_INTEVAL = 250;
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
				._createTargetIframe()
				._prepareThisForm()
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
			if('function'     == typeof config.progress) {
				_$this.progress = config.progress;
			}
			// 
			if('function'     == typeof config.success) {
				_$this.success  = config.success;
			}
			// 
			if('function'     == typeof config.error) {
				_$this.error    = config.error;
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
			var _$this   = this;
			// random upload_id
			_$this.uploadId = Math.floor(Math.random() * (Math.pow(2, 32) - 1)) + 1;
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
			// keep begin time
			_$this.begin  = (new Date()).getTime();
			// set loadede flag FALSE
			_$this.isIframeLoaded = false;
			// create progress bar, but if it already existed，just use it.
			if ( 0 == $('.jmoduploader-progress-container').length ){
				$('<div>')
					.attr('class', 'jmoduploader-progress-container')
					.attr('style', 'width:100%;')
					.append($('<div>')
						.attr('class', 'jmoduploader-progress-label')
						.text('Starting'))
					.append($('<div>')
						.attr('class', 'progress progress-info progress-striped')
						.append($('<div>')
							.attr('class', 'bar')
							.css('width', '0%')))
					.appendTo(_$this);
			}
			
			// _pollProgress
			setTimeout(function() {
				// execute polling
				_$this._pollProgress();
			}, 500);
			// call handler
			if('function' == typeof _$this.beforeUpload) {
				_$this.beforeUpload();
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
			var _$this   = this;
			// update progress property
			_$this.progress = progress;
			//  switch by the case
			switch(_$this._getProgressStatus()) {
				case Progress.STATUS_SUCCESS:
					// call _onAfterSubmit
					_$this._onAfterSubmit();
					break;
				case Progress.STATUS_FAILURE:
				case Progress.STATUS_ERROR:
					if(!_$this.isIframeLoaded) {
						// update ui
						_$this._updateUI();
						// settimeout next polling
						//setTimeout(function(){ _$this._pollProgress(); }, _$this.updateInterval);
					}//else{
					//	_$this._onAfterSubmit();
					//}
					_$this._onAfterSubmit();
					break;
				default:
					// update ui
					_$this._updateUI();
					// settimeout next polling
					setTimeout(function(){ _$this._pollProgress(); }, _$this.updateInterval);
					break;
			}
			// call handler
			if('function' == typeof _$this.progress) {
				_$this.progress();
			}
			// return
			return _$this;
		},
		/**
		 * _getProgressStatus
		 */
		_getProgressStatus: function() {
			trace('_getProgressStatus()');
			
			return ('undefined' == typeof this.progress) ? '' : this.progress.status;
		},
		/**
		 * _updateUI
		 */
		_updateUI: function() {
			trace('_updateUI()');
			// keep this
			var _$this   = this;
			// update
			_$this.find('.bar')
				.attr('style', 'width:' + _$this.progress.percentage + '%')
				.text(_$this.progress.percentage + ' %');
			
			_$this.find('.jmoduploader-progress-label')
				.text(
					'あと ' +  _$this._formatMilliSec(_$this.progress.takes) + 
					' (' + 
						_$this._formatBytes(_$this.progress.uploaded) + 'B / ' + _$this._formatBytes(_$this.progress.total) + 'B' + 
						' @ ' +
						_$this._formatBytes(_$this.progress.bps) + ' bps' +
						')');
			// return
			return _$this;
		},
		/**
		 * _formatBytes
		 */
		_formatBytes: function(bytes) {
			trace('_formatBytes(' + bytes + ')');
			
			if(bytes < 0) return '-';
			
			var _units = ['', ' K', ' M', ' G'];
			while(bytes > 1024){ 
				_units.shift();
				bytes /= 1024;
			}
			
			return (Math.round(bytes * 10) / 10).toFixed(1) + _units[0];
		},
		/**
		 * 
		 * @returns {String}
		 */
		_formatMilliSec: function(milliSec) {
			trace('_formatMilliSec(' + milliSec + ')');
			
			if (isNaN(milliSec) || milliSec < 0) {
				return '--:--:--';
			}
			
			var _sec = milliSec / 1000;
			
			var _time = [
			             parseInt(_sec / 60 / 60),
			             parseInt(_sec / 60) % 60, 
			             parseInt(_sec % 60)
			            ];
			return _time.join(":").replace(/\b(\d)\b/g, "0$1");
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
				case Progress.STATUS_FAILURE:
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
			var _$this    = this;
			// call handler
			if('function' == typeof _$this.success) {
				var _data  = {
					uploadId:    _$this.uploadId,
					begin:       _$this.begin,
					finish:      (new Date()).getTime(),
					size : 		_$this.progress.total,
					savedFileName: _$this._getSavedFileName()
				};
				_$this.success(_data);
			}
			return _$this;
		},
		
		_getSavedFileName:function(){
			var downloadLink;
			while (true){
				downloadLink = $(window.frames['backup-upload-frame'].document).find('a[href*=download]').attr('href');
				if ( 'undefined' != typeof(downloadLink) )
					break;
			}
			
			var fileName = downloadLink.replace(/http:\/\//g, '')
				.replace(window.location.host, '')
				.replace(/\/uploader\/download\//, '');
			
			return fileName;
		},
		
		/**
		 * _onError
		 */
		_onError: function() {
			trace('_onError()');
			// keep this
			var _$this    = this;
			// 
			_$this.find('.jmoduploader-progress-label')
				.text('ERROR');
			// call handler
			if('function' == typeof _$this.error) {
				_$this.error();
			}
			return _$this;
		}
  });
})(jQuery || Zepto);