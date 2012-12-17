/**
 * Douban Objects Chrome Extension
 *
 * @author icyleaf <icyleaf.cn@gmail.com>
 */
var dbObjects = {

	kinds: {
		'移动应用':'1024',
		'电子数码':'1001',
		'美容化妆':'1006',
		'游戏':'1020',
		'软件':'1021',
		'网站':'1023',
		'户外/运动':'1007',
		'食品':'1000',
		'汽车':'1010',
		'家电':'1009',
		'药物':'1015',
		'乐器':'1018',
		'玩具':'1019',
		'其它':'1022'
	},

	owner: '',
	items: [],

	init: function()
	{
		dbObjects.owner = $('li.nav-user-account a span:first').html().replace('的帐号', '');

		// Debug infos (only in debug mode)
		dbObjects.is_debug_mode();

		dbObjects.debug('ua: ' + navigator.userAgent);
		dbObjects.debug('user: ' + dbObjects.owner);
		dbObjects.debug('ck: ' + dbObjects.get_cookie('ck'));

		dbObjects.render_objects();
		dbObjects.bind_events();
	},

	render_objects: function()
	{
		if ($('div.notify-mod').html == 'undefined')
			return false;

		$('div.notify-mod').append('<div id="dbObjects-wrapper"><hr style="border:1px dashed #ccc"/><table style="width:100%;margin-bottom:0;margin-top:10px"><tr><th><input type="checkbox" id="check_switch" checked />友邻喜欢 <span id="dbObjects-count">(0)</span></th><th class="dater"><button id="one_key_likes" style="background:#83BF73;border:none;padding:2px 3px;color:white;margin-right:5px;cursor:pointer;">我也喜欢</button></th></tr></table></div>');
	
		$('#dbObjects-wrapper').hide();

		$('.status-item').each(function(i){
			var type = $(this).attr('data-target-type');
			var action = $(this).attr('data-action');
			if (type == 'ilmen' && action == 1)
			{
				var id = $(this).attr('data-object-id');
				var name = $(this).find('p.text a').last().html();

				var uurl = $(this).find('p.text a').first().attr('href');
				var uname = $(this).find('p.text a').first().html();
				var kid = $(this).attr('data-object-kind');
				var kname = $(this).find('.description').html().split(' / ')[0];

				if (dbObjects.owner != uname)
				{
					var item = {
						'id': id,
						'type': kid,
						'name': name,
						'kind': {
							'id': dbObjects.kinds[kname],
							'name': kname
						},
						'user': {
							'url': uurl,
							'name': uname
						}
					};

					dbObjects.debug(item);
					dbObjects.process_like(item);
				}
			}
		});
	},

	process_like: function(item)
	{
		var url = 'http://www.douban.com/subject/' + item.id;

		$.ajax({
			type: 'GET',
			url: url,
			success: function(html) {
				var obj = $(html).find('div.thing-favs').find('a.btn-fav');

				var faved = true;
				if (obj.hasClass('fav-add')) 
				{
					faved = false;

					var exist = false;
					for (var i = 0; i < dbObjects.items.length; i++)
					{
						if (dbObjects.items[i].id == item.id)
						{
							exist = true;
							break;
						}
					}

					if ( ! exist)
					{
						dbObjects.items.push(item);
						$('#dbObjects-count').html('(' + dbObjects.items.length + ')');
					}
				};

				var objectHTML = '<tr><td id="douban_like_' + item.id + '"><a class="fav-cancel" style="display:' + (faved ? 'inline-block' : 'none')  +';background-position:0px -17px;margin-left:0;padding-left:15px;cursor:default">&nbsp;</a><input checked type="checkbox" class="check_item" style="display:' + (faved ? 'none' : 'inline-block;margin-right:6px;')  +'"/>[<a style="margin-left:0" href="http://www.douban.com/subject/all?cat_id=' + item.kind.id + '">' + 
					item.kind.name + '</a>] <a href="http://www.douban.com/subject/' + item.id + '/">' + item.name + '</a></td><td class="dater" style="padding-right:5px"><a href="' + item.user.url + '">' + 
					item.user.name + '</td></tr>';

				$('#dbObjects-wrapper table tr:last').after(objectHTML);

				$('#dbObjects-wrapper').show();
			}
		});
	},

	bind_events: function()
	{
		$('input#check_switch').on('click', function(){
			var switch_status = $(this).attr('checked');
			$('input.check_item').each(function(i){
				var status = $(this).attr('checked');
				if (switch_status != status) $(this).attr('checked', !status);
			});
		});

		$('button#one_key_likes').on('click', function(){
			var url = 'http://www.douban.com/j/ilmen/like';
			var url_with_share =  'http://www.douban.com/j/ilmen/thing/%d/add_note';

			$('input.check_item').each(function(i){
				var status = $(this).attr('checked');
				if (status)
				{
					dbObjects.debug(dbObjects.items[i]);
					var h = dbObjects.items[i];

					var rl = $.ajax({
						type: 'POST',
						url: url,
						data: {
							tid: h.id,
							tkind: h.type,
							ck: dbObjects.get_cookie('ck')
						},
						success: function(m) {
							console.debug(i);
							$('#douban_like_' + h.id + ' a.fav-cancel').css('display', 'inline-block');
							$('#douban_like_' + h.id + ' input.check_item').css('display', 'none');
							dbObjects.debug(m);
						},
						dataType: 'json'
					});

					rl.done(function(d){
						dbObjects.debug('object like success');  
					})
					.fail(function(e){ 
						dbObjects.debug('object like error'); 
					});

					var rs = $.ajax({
						type: 'POST',
						url: url_with_share.replace('%d', h.id),
						data: {
							'shuo-share': "1",
							'act': 'like',
							'ck': dbObjects.get_cookie('ck')
						},
						success: function(m) {
							dbObjects.debug(m);
						},
						dataType: 'json'
					});

					rs.done(function(d){
						dbObjects.debug('and it share success');  
					})
					.fail(function(e){ 
						dbObjects.debug('also, it share error'); 
					});
				}
			});
		});
	},

	is_debug_mode: function()
	{
		var enable = false;
		var debug = dbObjects.parse_url(window.location.href).query.debug;
		if (debug == 1) enable = true;

		$('a').each(function(){
			var href = $(this).attr('href');
			if (enable)
			{
				href += (href.match(/\?/g) ? '&' : '?') + 'debug=1';
			}
			else
			{
				href = href.replace(/debug=\d+/g, '');
			}
			$(this).attr('href', href);
		});

		return enable;
	},

	debug: function(o)
	{
		var debug = dbObjects.parse_url(window.location.href).query.debug;
		if (debug == 1)
		{
			console.debug(o);
		}
	},

	parse_url: function(url)
	{
		var parser = document.createElement('a');
		parser.href = url;

		var query = {};
		var params = parser.search.replace('?', '').split('&');
		for (var i = 0; i < params.length; i++)
		{
			keyValue = params[i].split('=');
			query[keyValue[0]] = keyValue[1];
		}

		return {
			'protocol': parser.protocol,
			'hostname': parser.hostname,
			'port': parser.port,
			'path': parser.pathname,
			'search': parser.search,
			'query': query,
			'hash': parser.hash,
			'host': parser.host
		};
	},

	get_cookie: function(name)
	{
		var nameEQ = name + '=';
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) 
		{
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length).replace(/["']/g, '');
		}

		return null;
	}
};

// execute it!
$(document).ready(function(){
	dbObjects.init();
});