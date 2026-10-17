-- SQL_STORED_PROCEDURE dbo.SP_Fusion_All_Desc (modified 2015-01-25T14:04:48.550)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_Fusion_All_Desc]
as
SELECT *
  FROM [dbo].[Item_Fusion] order by [FusionID] desc

GO
