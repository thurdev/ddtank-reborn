-- SQL_STORED_PROCEDURE dbo.SP_Active_Convert_Item_Info_Single (modified 2015-01-25T14:04:48.410)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<读取一条活动记录>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_Convert_Item_Info_Single]
@ID int
AS  
 select * from Active_Convert_Item where [ActiveID] =@ID

GO
