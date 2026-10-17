-- VIEW dbo.V_Consortia_Apply_Ally (modified 2011-08-02T08:26:29.203)

CREATE VIEW dbo.V_Consortia_Apply_Ally
AS
SELECT dbo.Consortia_Apply_Ally.*, dbo.Consortia.ConsortiaName AS ConsortiaName, 
      dbo.Consortia.Repute AS Repute, dbo.Consortia.ChairmanName AS ChairmanName, 
      dbo.Consortia.[Count] AS [Count], dbo.Consortia.CelebCount AS CelebCount, 
      dbo.Consortia.Honor AS Honor, dbo.Consortia.[Level] AS [Level], 
      dbo.Consortia.Description AS Description
FROM dbo.Consortia_Apply_Ally LEFT OUTER JOIN
      dbo.Consortia ON dbo.Consortia_Apply_Ally.Consortia1ID = dbo.Consortia.ConsortiaID


GO
