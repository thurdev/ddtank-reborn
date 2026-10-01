-- SQL_STORED_PROCEDURE dbo.SP_Sys_BackUpData (modified 2021-06-04T05:18:35.710)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<备份数据库>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Sys_BackUpData] AS 
declare @filename nvarchar(100)--文件名 
set @filename='D:\DataBackUp\'+convert(varchar(10),getdate(),120)+'DB_Tank'+'.dat' --文件路径及文件名 
print @filename BACKUP DATABASE [Project_Game34] TO DISK = @filename WITH INIT , NOUNLOAD , NAME = N'XX数据备份', NOSKIP , STATS = 10, NOFORMAT

GO
