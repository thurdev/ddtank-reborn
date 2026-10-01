-- SQL_STORED_PROCEDURE dbo.SP_CustomPage (modified 2021-06-04T01:29:17.877)








-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<分页存储过程>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_CustomPage]
@QueryStr nvarchar(4000), --表名、视图名、查询语句
@QueryWhere nvarchar(4000), --查询条件
@PageSize int=10, --每页的大小(行数)
@PageCurrent int=1, --要显示的页
@FdShow nvarchar (4000)='', --要显示的字段列表,如果查询结果有标识字段,需要指定此值,且不包含标识字段
@FdOrder nvarchar (1000)='', --排序字段列表
@FdKey nvarchar(250)='', --强制指定主键
@TotalRow int output --总记录行数
as
declare @FdName nvarchar(250) --表中的主键或表、临时表中的标识列名
,@Id1 varchar(20),@Id2 varchar(20) --开始和结束的记录号
,@Id3 varchar(20) --预选的记录数
,@Obj_ID int --对象ID
,@TotalPage int --总页数
,@FdOrder_desc nvarchar(1000)  --'反'排序字段列表
,@FdOrder_desc1 nvarchar(1000) --'反'排序字段列表(临时)
,@FdOrder_desc2 nvarchar(1000) --'反'排序字段列表(临时)

If( (dbo.FiltSql(@QueryStr)=0)or(dbo.FiltSql(@QueryWhere)=0) or (dbo.FiltSql(@FdShow)=0) or  (dbo.FiltSql(@FdKey)=0) )
Begin
   Return
End


--表中有复合主键的处理
declare @strfd nvarchar(2000) --复合主键列表
,@strjoin nvarchar(4000) --连接字段
,@strwhere nvarchar(2000) --查询条件
--格式化初始参数
select @Obj_ID=object_id(@QueryStr)
,@FdShow=case isnull(@FdShow,'') when '' then ' *' else ' '+@FdShow end
,@FdOrder=case isnull(@FdOrder,'') when '' then '' else ' order by '+@FdOrder end
,@QueryWhere=case isnull(@QueryWhere,'') when '' then '1=1' else @QueryWhere end
select @FdOrder_desc1 = replace(@FdOrder, ' DESC', '^')
,@FdOrder_desc2 = replace(@FdOrder_desc1, ',', ' DESC,') + ' DESC'
,@FdOrder_desc = replace(@FdOrder_desc2, '^ DESC', '')
select @FdOrder = replace(@FdOrder, '^^', ',')
,@FdOrder_desc = replace(@FdOrder_desc, '^^', ',')
if left(@QueryStr,1)='('
  select @QueryStr=' '+@QueryStr
else
  select @QueryStr=case when @Obj_ID is not null then ' '+@QueryStr else ' ('+@QueryStr+') cp_a' end
--计算总行数和总页数
declare @temp1 nvarchar(4000)
select @temp1=N'select @temp2=count(*) from '+@QueryStr+' where '+@QueryWhere
exec sp_executesql @temp1, N' @temp2 int output ', @TotalRow output
if @TotalRow > 0
  set @TotalPage = (@TotalRow + @PageSize - 1) / @PageSize
else
  set @TotalPage = 1
if @PageCurrent > @TotalPage set @PageCurrent = @TotalPage
--如果显示第一页，可以直接用top来完成
if @PageCurrent=1
begin
  select @Id1=cast(@PageSize as varchar(20))
  exec('select top '+@Id1+@FdShow+' from '+@QueryStr+' where '+@QueryWhere+@FdOrder)
  return
end
--强制指定主键
if @FdKey<>''
begin
  select @Id1=cast(@PageSize as varchar(20))
  ,@Id2=cast((@PageCurrent-1)*@PageSize as varchar(20))
  ,@Id3=cast(@PageCurrent*@PageSize as varchar(20))
  select @FdName=@FdKey
  goto lbuseidentity
end
--如果是表,则检查表中是否有标识列或主键
if @Obj_ID is not null and objectproperty(@Obj_ID,'IsTable')=1
begin
  select @Id1=cast(@PageSize as varchar(20))
  ,@Id2=cast((@PageCurrent-1)*@PageSize as varchar(20))
  ,@Id3=cast(@PageCurrent*@PageSize as varchar(20))
  select @FdName=name from syscolumns where id=@Obj_ID and status=0x80
  if @@rowcount=0 --如果表中无标识列,则检查表中是否有主键
  begin
    if not exists(select 1 from sysobjects where parent_obj=@Obj_ID and xtype='PK')
      goto lbusetemp --如果表中无主键,则用临时表处理
    select @FdName=name from syscolumns where id=@Obj_ID and colid in(
      select colid from sysindexkeys where @Obj_ID=id and indid in(
         select indid from sysindexes where @Obj_ID=id and name in(
           select name from sysobjects where xtype='PK' and parent_obj=@Obj_ID
    )))
    if @@rowcount>1 --检查表中的主键是否为复合主键
    begin
      select @strfd='',@strjoin='',@strwhere=''
      select @strfd=@strfd+',['+name+']'
      ,@strjoin=@strjoin+' and a.['+name+']=b.['+name+']'
      ,@strwhere=@strwhere+' and b.['+name+'] is null'
      from syscolumns where id=@Obj_ID and colid in(
        select colid from sysindexkeys where @Obj_ID=id and indid in(
          select indid from sysindexes where @Obj_ID=id and name in(
            select name from sysobjects where xtype='PK' and parent_obj=@Obj_ID
        )))
      select @strfd=substring(@strfd,2,2000)
      ,@strjoin=substring(@strjoin,5,4000)
      ,@strwhere=substring(@strwhere,5,4000)
      goto lbusepk
    end
  end
end
else
goto lbusetemp
/*--使用标识列或主键为单一字段的处理方法--*/
lbuseidentity:
if (@PageCurrent >= @TotalPage) and (@TotalRow % @PageSize > 0)
  select @Id1 = @TotalRow % @PageSize
exec('select * from 
(select top '+@Id1+@FdShow+' from '+@QueryStr+' where '+@FdName+' in (
  select top '+@Id3+' '+@FdName+' from '+@QueryStr+' where '+@QueryWhere+@FdOrder
  +')'+@FdOrder_desc
+') cp_v5' + @FdOrder
)
return
/*--表中有复合主键的处理方法--*/
lbusepk: 
exec('select '+@FdShow+' from(select top '+@Id1+' a.* from
(select top 100 percent * from '+@QueryStr+' where '+@QueryWhere+@FdOrder+') a
left join (select top '+@Id2+' '+@strfd+' 
from '+@QueryStr+' where '+@QueryWhere+@FdOrder+') b on '+@strjoin+'
where '+@strwhere+') a'
)
return
/*--用临时表处理的方法--*/
lbusetemp: 
select @FdName='[ID_'+cast(newid() as varchar(40))+']'
,@Id1=cast(@PageSize*(@PageCurrent-1) as varchar(20))
,@Id2=cast(@PageSize*@PageCurrent-1 as varchar(20))
,@Id3=cast(@PageSize*@PageCurrent as varchar(20))
exec('select '+@FdName+'=identity(int,0,1),*
into #tb from (select top '+@Id3+' '+@FdShow+' from '+@QueryStr+' where '+@QueryWhere+@FdOrder+') cp_tb
select '+@FdShow+' from #tb where '+@FdName+' between '
+@Id1+' and '+@Id2
)










GO
