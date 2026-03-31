# **Project Game Git Cheat Sheet**

**Start New Work**

```powershell
cd "C:\\Users\\aliha\\Project Game"
git switch main
git pull --ff-only
git switch -c feat/short-name
```

Example:

```powershell
git switch -c feat/add-session-filters
```

**Check Where You Are**

```powershell
git branch --show-current
git status
```

**Save Work**

```powershell
git add -A
git commit -m "feat: short description"
```

Examples:

```powershell
git commit -m "feat: split campaign shell routes"
git commit -m "fix: stabilize campaign timestamp rendering"
git commit -m "chore: update playwright workflow"
```

**Push Your Branch**
First push:

```powershell
git push -u origin feat/short-name
```

Later pushes on the same branch:

```powershell
git push
```

**Skill Flow On A Feature Branch**

1. Work and commit as needed
2. Run `/design-review` if UI polish matters
3. Run `/qa` when feature is ready to test
4. Run `/review` before landing
5. Run `/ship` while still on the feature branch
6. After merge, run `/land-and-deploy`
7. Optionally run `/document-release`

**Very Important Rule**
Do feature work on a feature branch, not on `main`.

Good:

```powershell
git switch -c feat/my-work
```

Bad:

```powershell
git push origin main
```

for unfinished feature work

**If You Forget And Already Changed `main` Locally But Have NOT Pushed**

```powershell
git switch -c feat/short-name
```

That moves your current local commits onto a new branch name.

**If You Want To See Recent Commits**

```powershell
git log --oneline --decorate -n 10
```

**If You Want To Return To Main**

```powershell
git switch main
```

**If Git Says Main Is Behind GitHub**

```powershell
git switch main
git pull --ff-only
```

**If You Finished A Branch And Want To Start Fresh Next Time**

```powershell
git switch main
git pull --ff-only
git switch -c feat/next-task
```

**Commit Message Patterns**

* `feat: add X`
* `fix: correct Y`
* `chore: update Z`
* `refactor: simplify X`
* `test: cover Y`

**My Recommended Habit**
Every new task, start with exactly this:

```powershell
cd "C:\\Users\\aliha\\Project Game"
git switch main
git pull --ff-only
git switch -c feat/name-the-task
```

Then just work, commit, and when ready:

* `/review`
* `/qa`
* `/ship`

**Quick Recovery Rules**

* If unsure what branch you’re on:

```powershell
git branch --show-current
```

* If unsure what changed:

```powershell
git status
```

* If unsure what to do next, stop and ask before pushing to `main`.

