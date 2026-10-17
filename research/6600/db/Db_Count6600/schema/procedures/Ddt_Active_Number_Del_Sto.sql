-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Number_Del_Sto (modified 2012-04-21T07:53:25.200)





CREATE  PROCEDURE [dbo].[Ddt_Active_Number_Del_Sto] 
@ActiveID int,
@Mark int
AS
Delete From Db_Tank.dbo.Active_Number Where ActiveID=@ActiveID And Mark=@Mark





GO
