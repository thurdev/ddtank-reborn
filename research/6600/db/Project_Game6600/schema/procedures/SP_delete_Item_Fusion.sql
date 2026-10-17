-- SQL_STORED_PROCEDURE dbo.SP_delete_Item_Fusion (modified 2015-01-25T14:04:48.530)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_delete_Item_Fusion] 
		   @FusionID int
          
AS

DELETE FROM [dbo].[Item_Fusion]
      WHERE FusionID=@FusionID

GO
