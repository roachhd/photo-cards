# Photo cards

A personal project in progress. Trying to build an image gallery for displaying photography, with optional accompanying text. Focus is on giving breathing room to pictures.

One thing I’d like to do is offering this as an addition — or alternate view — to a column presentation (such as [these](http://fvsch.com/photos/misc-2013/) [galleries](http://fvsch.com/photos/nu-a-la-fenetre/)). I’m considering applying the same card layout system for both column presentation and full-viewport (or boxed) presentation. Right now I’m only working on the full-viewport mode.

(This project probably suffers from NIH syndrome.)

## TODO

[x] Replace updateUIParts() with 3 functions.
[x] Changing "global" variable names to use a leading underscore,
	so that function code is differentiated and it’s easier to
	see when functions are setting "globals".
[x] Initial hash and hashchange still working alright?
[x] Switched to data-currentcolor for the *shown* background color,
	but not sure the CSS was updated accordingly.

[x] Trying to make images display as background.

[-] Initial take on image borders
[ ] Double card
[ ] Figcaption

[ ] WebKit and Chrome bugs :((

[ ] Do browsers load `<noscript><img src="…"></noscript>`?
[ ] Probably better to have something which sets up the photoset  DOM structure using JavaScript?
