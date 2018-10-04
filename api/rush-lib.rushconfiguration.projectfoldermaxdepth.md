[Home](./index) &gt; [@microsoft/rush-lib](./rush-lib.md) &gt; [RushConfiguration](./rush-lib.rushconfiguration.md) &gt; [projectFolderMaxDepth](./rush-lib.rushconfiguration.projectfoldermaxdepth.md)

# RushConfiguration.projectFolderMaxDepth property

The maximum allowable folder depth for the projectFolder field in the rush.json file. This setting provides a way for repository maintainers to discourage nesting of project folders that makes the directory tree more difficult to navigate. The default value is 2, which implements on a standard convention of <categoryFolder>/<projectFolder>/package.json.

**Signature:**
```javascript
projectFolderMaxDepth: number
```