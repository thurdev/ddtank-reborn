-- SQL_STORED_PROCEDURE dbo.SP_Server_Config_Single (modified 2021-06-04T05:18:35.670)


-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2010-1-8>
-- Description:	根据Key获取服务器配置
-- =============================================
CREATE Procedure [dbo].[SP_Server_Config_Single]
	@Key nvarchar(50)
AS
BEGIN
	select * from Server_Config where Name = @Key
END










GO
