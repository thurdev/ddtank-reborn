-- SQL_STORED_PROCEDURE dbo.SP_Consortia_All (modified 2021-06-04T05:18:34.867)



-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：显示已存在公会>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_All]
 AS  
   begin 
     select * from Consortia where IsExist=1
   end











GO
