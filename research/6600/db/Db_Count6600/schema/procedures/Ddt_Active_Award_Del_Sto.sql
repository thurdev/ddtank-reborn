-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Award_Del_Sto (modified 2012-04-21T07:53:25.153)




CREATE  PROCEDURE [dbo].[Ddt_Active_Award_Del_Sto] 
@Id Integer
AS
Delete From Db_Tank.dbo.Active_Award Where id=@Id






GO
