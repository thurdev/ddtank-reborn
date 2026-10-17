-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Del_Sto (modified 2012-04-21T07:53:24.983)




CREATE  PROCEDURE [dbo].[Ddt_Active_Del_Sto] 
@Id Integer
AS
Delete From Db_Tank.dbo.Active Where ActiveID=@Id

Delete From Db_Tank.dbo.Active_Award Where ActiveId=@Id




GO
