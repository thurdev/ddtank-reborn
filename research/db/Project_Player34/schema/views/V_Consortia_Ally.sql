-- VIEW dbo.V_Consortia_Ally (modified 2020-12-11T12:41:32.930)
CREATE VIEW [dbo].[V_Consortia_Ally]
AS
SELECT        dbo.Consortia_Ally.ID, dbo.Consortia_Ally.Consortia1ID, dbo.Consortia_Ally.Consortia2ID, dbo.Consortia_Ally.State, dbo.Consortia_Ally.Date, dbo.Consortia_Ally.ValidDate, dbo.Consortia_Ally.IsExist, 
                         a.ConsortiaName AS ConsortiaName1, a.Count AS Count1, a.Repute AS Repute1, b.ConsortiaName AS ConsortiaName2, b.Count AS Count2, b.Repute AS Repute2, a.[Level] AS Level1, b.[Level] AS Level2, 
                         a.Honor AS Honor1, b.Honor AS Honor2, a.ChairmanName AS ChairmanName1, b.ChairmanName AS ChairmanName2, a.Description AS Description1, b.Description AS Description2, a.Riches AS Riches1, 
                         b.Riches AS Riches2
FROM            dbo.Consortia_Ally LEFT OUTER JOIN
                         dbo.Consortia AS a ON dbo.Consortia_Ally.Consortia1ID = a.ConsortiaID LEFT OUTER JOIN
                         dbo.Consortia AS b ON dbo.Consortia_Ally.Consortia2ID = b.ConsortiaID

GO
