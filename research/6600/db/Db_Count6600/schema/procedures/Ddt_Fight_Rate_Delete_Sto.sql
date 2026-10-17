-- SQL_STORED_PROCEDURE dbo.Ddt_Fight_Rate_Delete_Sto (modified 2012-04-21T07:53:24.967)

CREATE  PROCEDURE Ddt_Fight_Rate_Delete_Sto
 @ID int
 AS 
--创建人:Andy	--创建时间:2009-08-20	--说明:战斗换装表 删除
 Delete from Db_Tank.dbo.Fight_Rate where ID=@ID

GO
