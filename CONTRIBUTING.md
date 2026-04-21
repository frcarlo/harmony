# Contributing to HArmony

First off, thank you for considering contributing to HArmony. It's people like you that make HArmony such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](https://github.com/frcarlo/harmony/issues) to see if someone else has already created a ticket. If not, go ahead and make one!

## Fork & create a branch

If this is something you think you can fix, then fork HArmony and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```bash
git checkout -b 325-add-new-widget
```

## Get the test suite running

Make sure you have Node.js 22+ installed and run:

```bash
cd nuxt
npm install
npm run dev
```

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with HArmony's master branch:

```bash
git remote add upstream https://github.com/frcarlo/harmony.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout 325-add-new-widget
git rebase master
git push --set-upstream origin 325-add-new-widget
```

Finally, go to GitHub and make a Pull Request.

## Code review

Once your pull request is opened, it will be reviewed. We may suggest some changes or improvements or alternatives.

Some things that will increase the chance that your pull request is accepted:

* Write tests.
* Write a good commit message.
* Keep your code style consistent with the rest of the project.
