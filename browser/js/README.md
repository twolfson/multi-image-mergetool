# browser/js
We are using a bespoke framework for our application. We don't want heavy components buy-in at the moment due to wanting flexibility with overlay and such to the point where they can be broken out into their own repos.

We are attempting to have a declarative-esque UI and one-way data flow for simplicity a la React.

We have decided not to use a fully declarative UI as that would require a virtual DOM which would require sacrificing some performance (e.g. image reuse/canvas generation). Our virtual DOM exploration can be found here:

https://github.com/twolfson/multi-image-mergetool/compare/8958bdd...3bf9cae
