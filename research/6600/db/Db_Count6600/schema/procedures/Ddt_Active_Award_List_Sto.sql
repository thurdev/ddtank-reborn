-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Award_List_Sto (modified 2012-04-21T07:53:25.170)



CREATE  PROCEDURE  [dbo].[Ddt_Active_Award_List_Sto]  
 @ActiveID int
 AS  
 Select A.*,B.Name as ItemName From db_tank.dbo.Active_Award  A with(nolock)
        Left Outer join db_tank.dbo.Shop_Goods B with(nolock)
              On A.itemId=B.TemplateId
        Where A.ActiveID=@ActiveID
GO
