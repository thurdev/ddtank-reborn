-- VIEW dbo.V_Consortia_Apply_Ally (modified 2020-12-11T12:41:32.933)
CREATE VIEW [dbo].[V_Consortia_Apply_Ally]
AS
SELECT        dbo.Consortia_Apply_Ally.ID, dbo.Consortia_Apply_Ally.Consortia1ID, dbo.Consortia_Apply_Ally.Consortia2ID, dbo.Consortia_Apply_Ally.Date, dbo.Consortia_Apply_Ally.Remark, dbo.Consortia_Apply_Ally.IsExist,
                          dbo.Consortia_Apply_Ally.State, dbo.Consortia.ConsortiaName, dbo.Consortia.Repute, dbo.Consortia.ChairmanName, dbo.Consortia.Count, dbo.Consortia.CelebCount, dbo.Consortia.Honor, dbo.Consortia.[Level], 
                         dbo.Consortia.Description
FROM            dbo.Consortia_Apply_Ally LEFT OUTER JOIN
                         dbo.Consortia ON dbo.Consortia_Apply_Ally.Consortia1ID = dbo.Consortia.ConsortiaID

GO
