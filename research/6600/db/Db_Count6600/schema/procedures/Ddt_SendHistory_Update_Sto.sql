-- SQL_STORED_PROCEDURE dbo.Ddt_SendHistory_Update_Sto (modified 2012-04-21T07:53:25.013)


--创建人:危超云
--创建时间:2008-12-16
--说明:记录赠总物品的历史记录
CREATE  PROCEDURE [dbo].[Ddt_SendHistory_Update_Sto] 
@Id Integer
AS
Update Db_Tank.Dbo.Ddt_SendHistory Set Static=1 Where Id=@Id



GO
