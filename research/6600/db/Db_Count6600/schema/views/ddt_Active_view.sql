-- VIEW dbo.ddt_Active_view (modified 2012-04-21T07:53:24.640)
CREATE VIEW [dbo].[ddt_Active_view]
AS
SELECT     ActiveID AS id, Title, Description, Content, AwardContent, HasKey, StartDate, EndDate, IsOnly, Type,ActionTimeContent
FROM         Db_Tank.dbo.Active




GO
