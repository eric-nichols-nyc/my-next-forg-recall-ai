# Setting Up a New Project from Boilerplate

## Quick Start

1. **Clone the boilerplate:**
   ```bash
   git clone git@github.com:eric-nichols-nyc/my-next-forge.git my-new-project
   cd my-new-project
   ```

2. **Remove the boilerplate remote (CRITICAL!):**
   ```bash
   git remote remove origin
   ```

3. **Create a new empty repository on GitHub**

4. **Add your new remote:**
   ```bash
   git remote add origin git@github.com:eric-nichols-nyc/my-new-project.git
   ```

5. **Verify (should only show your new repo):**
   ```bash
   git remote -v
   ```

6. **Push to your new repo:**
   ```bash
   git push -u origin main
   ```

## Why This Matters

If you don't remove the original remote, you might accidentally:
- Push your changes to the boilerplate repo
- Overwrite the boilerplate with your project code
- Break the boilerplate for others

## Using the Helper Script

You can also use the provided script:
```bash
./setup-new-project.sh my-new-project eric-nichols-nyc
```

## Alternative: Keep Boilerplate as Reference

If you want to keep the boilerplate remote for pulling updates:
```bash
git remote rename origin boilerplate
git remote add origin git@github.com:eric-nichols-nyc/my-new-project.git
```

Then you can:
- Pull updates: `git fetch boilerplate`
- Push your code: `git push origin main` (safe, goes to your repo)


