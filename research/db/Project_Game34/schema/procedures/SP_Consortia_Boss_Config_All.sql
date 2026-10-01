-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Boss_Config_All (modified 2021-06-04T01:29:17.820)




-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：显示已存在公会>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Boss_Config_All]
 AS  
   begin 
     select * from Consortia_Boss_Config
   end












GO
