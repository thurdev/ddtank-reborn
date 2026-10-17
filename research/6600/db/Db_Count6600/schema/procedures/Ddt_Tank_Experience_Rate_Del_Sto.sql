-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_Experience_Rate_Del_Sto (modified 2012-04-21T07:53:24.763)


CREATE  PROCEDURE Ddt_Tank_Experience_Rate_Del_Sto 
 @ServerID int,
 @type int
 AS 
/*删除Experience_Rate数据*/
 Delete from Db_Tank.dbo.Rate  where ServerID=@ServerID and type=@type
GO
