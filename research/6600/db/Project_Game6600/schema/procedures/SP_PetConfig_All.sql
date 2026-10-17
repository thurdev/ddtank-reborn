-- SQL_STORED_PROCEDURE dbo.SP_PetConfig_All (modified 2015-01-25T14:04:48.657)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_PetConfig_All]
as
select * from Pet_Config

GO
