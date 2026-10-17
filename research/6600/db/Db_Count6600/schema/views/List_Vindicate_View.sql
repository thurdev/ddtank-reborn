-- VIEW dbo.List_Vindicate_View (modified 2012-04-21T07:53:25.107)


CREATE VIEW [dbo].[List_Vindicate_View]
AS
select v.*,s.serverName,s.ServerUrl from Vindicate as v,serverinfo as s where v.server = s.id







GO
