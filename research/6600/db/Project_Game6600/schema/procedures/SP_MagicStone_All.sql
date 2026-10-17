-- SQL_STORED_PROCEDURE dbo.SP_MagicStone_All (modified 2015-01-25T14:04:48.570)
-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：显示已存在公会>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MagicStone_All]
 AS  
   begin 
     select * from [dbo].[Magicstone_Template]
   end

GO
