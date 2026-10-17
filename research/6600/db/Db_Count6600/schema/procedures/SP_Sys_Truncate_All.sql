-- SQL_STORED_PROCEDURE dbo.SP_Sys_Truncate_All (modified 2012-04-21T07:53:25.187)
CREATE  PROCEDURE [dbo].[SP_Sys_Truncate_All]
as
truncate table Count_Application
truncate table Count_Application_Line
truncate table Count_Application_Server
truncate table Count_Application_Sub
truncate table Count_Config
truncate table Count_Content
truncate table Count_FightInfo
truncate table Count_Login
truncate table Count_Money
truncate table Count_Register
truncate table Count_Shop
truncate table Count_Way
truncate table Record_Level
truncate table Record_Sort
truncate table Record_Strengthen


GO
