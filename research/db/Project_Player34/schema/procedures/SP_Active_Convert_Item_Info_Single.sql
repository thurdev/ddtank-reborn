-- SQL_STORED_PROCEDURE dbo.SP_Active_Convert_Item_Info_Single (modified 2021-06-04T05:18:34.387)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<读取一条活动记录>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_Convert_Item_Info_Single]
@ID int
AS  
 select * from [Project_Game34].[dbo].Active_Convert_Item where [ActiveID] =@ID












GO
