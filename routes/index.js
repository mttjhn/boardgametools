
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Board Game Tools' });
};

exports.playhistory = function(req, res){
  res.render('playhistory', {title: 'Play History'});
};

exports.lastplays = function(req, res){
  res.render('lastplays', {title: 'Last Plays'});
};