-- SQL_STORED_PROCEDURE dbo.SP_PetTemplateInfo_All (modified 2015-01-25T14:04:48.650)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_PetTemplateInfo_All]
as
select * from Pet_Template_Info

GO
