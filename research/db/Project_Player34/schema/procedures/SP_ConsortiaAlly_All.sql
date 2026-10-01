-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaAlly_All (modified 2021-06-04T05:18:35.033)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：显示全部公会同盟关系>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaAlly_All]
 AS  
   begin 
     select * from Consortia_Ally where IsExist=1
   end










GO
